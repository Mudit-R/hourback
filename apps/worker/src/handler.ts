import * as dotenv from 'dotenv';
dotenv.config();

import type { SQSEvent, SQSHandler, SQSRecord } from 'aws-lambda';
import { v4 as uuidv4 } from 'uuid';
import knex from 'knex';
import { SQSMessageBodySchema } from '@hourback/shared';
import type { CommentTone, CommentLength } from '@hourback/shared';
import { createProvider } from '@hourback/llm';
import { buildEvidencePack } from './evidencePack';
import { sanitizeStudentEvidence, rehydrateName, STUDENT_TOKEN } from './tokenizer';
import { outcomeOfExistingDraft, settleGeneration } from './jobProgress';
import type { GenerationTarget } from './jobProgress';
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

const llm = createProvider(
  process.env['LLM_PROVIDER'] ?? (process.env['GROQ_API_KEY'] ? 'groq' : 'mock'),
);

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

export async function processMessageData(data: GenerationTarget & {
  tone: CommentTone;
  length: CommentLength;
  attempt?: number;
}): Promise<void> {
  const { jobId, studentId, periodId, tone, length } = data;

  // Reuse existing drafts for a new job and skip redeliveries before inference.
  if (await settleGeneration(db, data, (trx) => outcomeOfExistingDraft(trx, studentId, periodId))) {
    return;
  }

  // ── 3. Load data ──────────────────────────────────────────────────────────
  const [student, period, assessmentResults, observations] = await Promise.all([
    db('students as s')
      .join('classes as c', 's.class_id', 'c.id')
      .where('s.id', studentId)
      .select('s.name', 's.preferred_name', 's.class_id', 'c.subject', 'c.grade')
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

  // ── 4. Remove student identifiers from every free-text evidence field ─────
  const classmates = await db('students')
    .where({ class_id: student.class_id })
    .select('name', 'preferred_name');
  const sanitize = (text: string) => sanitizeStudentEvidence(
    text,
    student.name as string,
    student.preferred_name as string | null,
    classmates as Array<{ name: string; preferred_name: string | null }>,
  );
  const sanitizedObservations = observations.map((o: { id: string; text: string; tag: string | null; created_at: Date }) => ({
    ...o,
    text: sanitize(o.text),
  }));
  const sanitizedAssessmentResults = assessmentResults.map((result: { feedback: string | null }) => ({
    ...result,
    feedback: result.feedback ? sanitize(result.feedback) : null,
  }));

  // ── 5. Build evidence pack from sanitized data ────────────────────────────
  const pack = buildEvidencePack({
    studentToken: STUDENT_TOKEN,
    assessmentResults: sanitizedAssessmentResults as Parameters<typeof buildEvidencePack>[0]['assessmentResults'],
    observations: sanitizedObservations as Parameters<typeof buildEvidencePack>[0]['observations'],
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

  const settled = await settleGeneration(db, data, async (trx) => {
    const inserted = await trx('report_comments')
      .insert({
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
      })
      .onConflict(['student_id', 'period_id'])
      .ignore()
      .returning('id');

    if (inserted.length === 0) return outcomeOfExistingDraft(trx, studentId, periodId);

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
    return validation.valid ? 'done' : 'failed';
  });
  if (!settled) {
    throw new Error('A competing draft was removed during generation. Retry the message.');
  }
}

export async function recordGenerationFailure(target: GenerationTarget): Promise<void> {
  await settleGeneration(db, target, async (trx) => {
    return (await outcomeOfExistingDraft(trx, target.studentId, target.periodId)) ?? 'failed';
  });
}
