import * as dotenv from 'dotenv';
dotenv.config();

import type { SQSEvent, SQSHandler, SQSRecord } from 'aws-lambda';
import { v4 as uuidv4 } from 'uuid';
import knex from 'knex';
import { SQSMessageBodySchema } from '@hourback/shared';
import type { CommentTone, CommentLength } from '@hourback/shared';
import { createProvider } from '@hourback/llm';
import { buildEvidencePack } from './evidencePack';
import { tokenizeName, rehydrateName, STUDENT_TOKEN } from './tokenizer';
import {
  validateLLMResponse,
  buildValidatorFeedback,
  computeGroundednessScore,
} from './validator';

// ── DB ────────────────────────────────────────────────────────────────────────
const rawConnectionString =
  process.env['DATABASE_URL'] ?? 'postgresql://hourback:hourback@localhost:5432/hourback';
const isCloudOrSsl =
  rawConnectionString.includes('sslmode=require') ||
  rawConnectionString.includes('neon.tech') ||
  rawConnectionString.includes('supabase.co') ||
  rawConnectionString.includes('supabase.com') ||
  process.env['NODE_ENV'] === 'production';
const connectionString = rawConnectionString.replace(/[\?&]sslmode=[^&]+/, '');

const db = knex({
  client: 'postgresql',
  connection: isCloudOrSsl
    ? { connectionString, ssl: { rejectUnauthorized: false } }
    : connectionString,
  pool: { min: 1, max: 5 },
});

const llm = createProvider(process.env['LLM_PROVIDER'] ?? 'mock');

// ── SQS Handler ───────────────────────────────────────────────────────────────
export const handler: SQSHandler = async (event: SQSEvent) => {
  const failures: { itemIdentifier: string }[] = [];

  for (const record of event.Records) {
    try {
      await processRecord(record);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[worker] Failed to process message ${record.messageId}: ${msg}`);
      // Return to SQS as partial failure so only this message is retried
      failures.push({ itemIdentifier: record.messageId });
    }
  }

  if (failures.length > 0) {
    return { batchItemFailures: failures };
  }
};

async function processRecord(record: SQSRecord): Promise<void> {
  // ── 1. Parse & validate message ───────────────────────────────────────────
  let body: unknown;
  try {
    body = JSON.parse(record.body);
  } catch {
    throw new Error(`Invalid JSON in SQS message body: ${record.body.slice(0, 100)}`);
  }

  const parsed = SQSMessageBodySchema.safeParse(body);
  if (!parsed.success) {
    throw new Error(`Invalid message schema: ${parsed.error.message}`);
  }

  await processMessageData(parsed.data);
}

export async function processMessageData(data: {
  jobId: string;
  studentId: string;
  periodId: string;
  tone: CommentTone;
  length: CommentLength;
  attempt?: number;
}): Promise<void> {
  const { jobId, studentId, periodId, tone, length } = data;

  // ── 2. Idempotency check ──────────────────────────────────────────────────
  const existing = await db('report_comments')
    .where({ student_id: studentId, period_id: periodId })
    .select('id')
    .first();

  if (existing) {
    // Message already processed (redelivery or existing comments in class) — ack silently and mark completed in job
    console.warn(`[worker] Idempotency: comment already exists for student=${studentId} period=${periodId}, counting toward job completion`);
    await db('generation_jobs').where({ id: jobId }).increment('done', 1);
    await updateJobStatusIfComplete(jobId);
    return;
  }

  // ── 3. Load data ──────────────────────────────────────────────────────────
  const [student, period, assessmentResults, observations] = await Promise.all([
    db('students as s')
      .join('classes as c', 's.class_id', 'c.id')
      .where('s.id', studentId)
      .select('s.name', 's.preferred_name', 'c.subject', 'c.grade')
      .first(),
    db('report_periods').where({ id: periodId }).select('name').first(),
    db('assessment_results as ar')
      .join('criteria as c', 'ar.criterion_id', 'c.id')
      .where('ar.student_id', studentId)
      .select(
        'ar.id', 'ar.criterion_id', 'ar.level', 'ar.feedback',
        'c.name as criterion_name', 'c.max_level',
      ),
    db('observations').where({ student_id: studentId }).select('id', 'text', 'tag', 'created_at'),
  ]);

  if (!student || !period) {
    throw new Error(`Data not found: student=${studentId} period=${periodId}`);
  }

  // ── 4. Tokenize ───────────────────────────────────────────────────────────
  // Evidence text doesn't contain name usually, but we tokenize just in case
  const tokenizedObs = observations.map((o: { id: string; text: string; tag: string | null; created_at: Date }) => ({
    ...o,
    text: tokenizeName(o.text, student.name as string, student.preferred_name as string | null),
  }));

  // ── 5. Build evidence pack ────────────────────────────────────────────────
  const pack = buildEvidencePack({
    studentToken: STUDENT_TOKEN,
    assessmentResults: assessmentResults as Parameters<typeof buildEvidencePack>[0]['assessmentResults'],
    observations: tokenizedObs as Parameters<typeof buildEvidencePack>[0]['observations'],
    period: period as { name: string },
    classData: { subject: student.subject as string, grade: student.grade as string },
    tone: tone as CommentTone,
    length: length as CommentLength,
  });

  // ── 6. LLM call with one retry ────────────────────────────────────────────
  const startMs = Date.now();
  let llmResponse = await llm.generate(pack);
  let validation = validateLLMResponse(llmResponse, pack);

  if (!validation.valid) {
    // Retry once with validator feedback injected
    const feedback = buildValidatorFeedback(validation.errors);
    llmResponse = await llm.generate(pack, feedback);
    validation = validateLLMResponse(llmResponse, pack);
  }

  const generationMs = Date.now() - startMs;
  const groundednessScore = computeGroundednessScore(llmResponse, pack);

  // ── 7. Re-hydrate names ───────────────────────────────────────────────────
  const preferredName = student.preferred_name as string | null;
  const realName = student.name as string;

  const sentences = llmResponse.sentences.map((s) => ({
    ...s,
    text: rehydrateName(s.text, preferredName, realName),
  }));

  const draftText = sentences.map((s) => s.text).join(' ');
  const status = validation.valid ? 'draft' : 'flagged';

  // ── 8. Persist comment + citations ────────────────────────────────────────
  const commentId = uuidv4();

  try {
    await db.transaction(async (trx) => {
      await trx('report_comments').insert({
        id: commentId,
        student_id: studentId,
        period_id: periodId,
        job_id: jobId,
        draft_text: draftText,
        final_text: null,
        status,
        model: llm.name,
        groundedness_score: groundednessScore,
        edit_distance: null,
        generation_ms: generationMs,
        tone,
        length,
      });

      if (sentences.length > 0) {
        const citations = sentences.flatMap((s, sentenceIdx) =>
          s.evidence_ids.map((sourceId) => ({
            id: uuidv4(),
            comment_id: commentId,
            sentence_idx: sentenceIdx,
            source_type: pack.items.find((i) => i.id === sourceId)?.type ?? 'observation',
            source_id: sourceId,
          })),
        );

        if (citations.length > 0) {
          await trx('comment_citations').insert(citations);
        }
      }
    });
  } catch (err: unknown) {
    // Unique constraint violation = race condition (two workers processed same message)
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('duplicate') || msg.includes('unique')) {
      console.warn(`[worker] Race condition resolved: comment already inserted for student=${studentId}`);
      return;
    }
    throw err;
  }

  // ── 9. Update job progress ────────────────────────────────────────────────
  if (validation.valid) {
    await db('generation_jobs').where({ id: jobId }).increment('done', 1);
  } else {
    await db('generation_jobs').where({ id: jobId }).increment('failed', 1);
  }

  // Mark job completed if all students done
  await updateJobStatusIfComplete(jobId);
}

async function updateJobStatusIfComplete(jobId: string): Promise<void> {
  const job = await db('generation_jobs')
    .where({ id: jobId })
    .select('total', 'done', 'failed')
    .first();

  if (!job) return;

  const processed = (job.done as number) + (job.failed as number);
  if (processed >= (job.total as number)) {
    const newStatus =
      (job.failed as number) === 0
        ? 'completed'
        : (job.done as number) === 0
          ? 'failed'
          : 'partial';

    await db('generation_jobs').where({ id: jobId }).update({ status: newStatus });
  }
}
