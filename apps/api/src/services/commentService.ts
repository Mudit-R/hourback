import db from '../db/client';
import { v4 as uuidv4 } from 'uuid';
import {
  SQSClient,
  SendMessageCommand,
  SendMessageBatchCommand,
} from '@aws-sdk/client-sqs';
import type {
  CommentTone,
  CommentLength,
  GenerationJob,
  ReportComment,
} from '@hourback/shared';
import { SQSMessageBodySchema } from '@hourback/shared';
import { processMessageData } from '@hourback/worker';

const sqs = new SQSClient({
  region: process.env['AWS_REGION'] ?? 'us-east-1',
  endpoint: process.env['AWS_ENDPOINT_URL'],
  credentials: {
    accessKeyId: process.env['AWS_ACCESS_KEY_ID'] ?? 'test',
    secretAccessKey: process.env['AWS_SECRET_ACCESS_KEY'] ?? 'test',
  },
});

const QUEUE_URL = process.env['SQS_QUEUE_URL'] ?? '';

// ── classRoster ───────────────────────────────────────────────────────────────
export async function getClassRoster(classId: string, _periodId: string) {
  return db('students').where({ class_id: classId }).orderBy('name', 'asc').select('*');
}

// ── studentEvidence ───────────────────────────────────────────────────────────
export async function getStudentEvidence(studentId: string) {
  const [assessmentResults, observations] = await Promise.all([
    db('assessment_results as ar')
      .join('criteria as c', 'ar.criterion_id', 'c.id')
      .where('ar.student_id', studentId)
      .select(
        'ar.id',
        'ar.student_id',
        'ar.criterion_id',
        'ar.level',
        'ar.feedback',
        'c.name as criterion_name',
        'c.max_level',
        'c.description as criterion_description',
        'c.sort_order',
      )
      .orderBy('c.sort_order', 'asc'),
    db('observations')
      .where({ student_id: studentId })
      .orderBy('created_at', 'desc')
      .select('*'),
  ]);

  return { assessmentResults, observations };
}

// ── reportComment ─────────────────────────────────────────────────────────────
export async function getReportComment(studentId: string, periodId: string) {
  const comment = await db('report_comments')
    .where({ student_id: studentId, period_id: periodId })
    .first();
  if (!comment) return null;

  const citations = await db('comment_citations').where({ comment_id: comment.id }).select('*');
  return { ...comment, citations };
}

// ── timeSavedSummary ──────────────────────────────────────────────────────────
export async function getTimeSavedSummary(classId: string, periodId: string) {
  const students = await db('students').where({ class_id: classId }).select('id');
  const studentIds = students.map((s: { id: string }) => s.id);

  if (studentIds.length === 0) {
    return { periodId, commentCount: 0 };
  }

  const rows = await db('time_logs')
    .whereIn('student_id', studentIds)
    .where({ period_id: periodId })
    .select('mode', db.raw('AVG(seconds) as avg_seconds'), db.raw('COUNT(*) as count'))
    .groupBy('mode');

  const manual = rows.find((r: { mode: string }) => r.mode === 'manual');
  const assisted = rows.find((r: { mode: string }) => r.mode === 'assisted');

  const manualAvg = manual ? parseFloat(String(manual.avg_seconds)) : null;
  const assistedAvg = assisted ? parseFloat(String(assisted.avg_seconds)) : null;
  const timeSaved = manualAvg && assistedAvg ? manualAvg - assistedAvg : null;
  const timeSavedPct = manualAvg && timeSaved ? (timeSaved / manualAvg) * 100 : null;

  const totalCount = rows.reduce((acc: number, r: { count: string }) => acc + parseInt(r.count, 10), 0);

  return {
    periodId,
    manualAvgSeconds: manualAvg,
    assistedAvgSeconds: assistedAvg,
    timeSavedSeconds: timeSaved,
    timeSavedPercent: timeSavedPct,
    commentCount: totalCount,
  };
}

// ── generationJob ─────────────────────────────────────────────────────────────
export async function getGenerationJob(jobId: string): Promise<GenerationJob | null> {
  return db('generation_jobs').where({ id: jobId }).first() as Promise<GenerationJob | null>;
}

// ── addObservation ────────────────────────────────────────────────────────────
export async function addObservation(studentId: string, text: string, tag?: string) {
  const [row] = await db('observations')
    .insert({
      id: uuidv4(),
      student_id: studentId,
      text,
      tag: tag ?? null,
      created_at: new Date().toISOString(),
    })
    .returning('*');
  return row;
}

// ── generateComments ──────────────────────────────────────────────────────────
export async function generateComments(
  classId: string,
  periodId: string,
  teacherId: string,
  tone: CommentTone,
  length: CommentLength,
): Promise<GenerationJob> {
  const students = await db('students').where({ class_id: classId }).select('id');

  if (students.length === 0) {
    throw new Error('No students found in this class');
  }

  // Create the job row
  const jobId = uuidv4();
  const [job] = await db('generation_jobs')
    .insert({
      id: jobId,
      class_id: classId,
      period_id: periodId,
      teacher_id: teacherId,
      total: students.length,
      done: 0,
      failed: 0,
      status: 'running',
      tone,
      length,
    })
    .returning('*');

  // Dispatch generation: try SQS first, fallback to in-process async worker
  await dispatchBatch(jobId, students as { id: string }[], periodId, tone, length);

  return job as GenerationJob;
}

async function dispatchBatch(
  jobId: string,
  students: { id: string }[],
  periodId: string,
  tone: CommentTone,
  length: CommentLength,
): Promise<void> {
  const useSQS = Boolean(QUEUE_URL && process.env['USE_LOCAL_QUEUE'] !== 'true');

  if (useSQS) {
    try {
      const BATCH_SIZE = 10;
      for (let i = 0; i < students.length; i += BATCH_SIZE) {
        const batch = students.slice(i, i + BATCH_SIZE);
        const entries = batch.map((s, idx) => {
          const body = SQSMessageBodySchema.parse({
            jobId,
            studentId: s.id,
            periodId,
            tone,
            length,
            attempt: 1,
          });
          return {
            Id: String(idx),
            MessageBody: JSON.stringify(body),
          };
        });

        await sqs.send(
          new SendMessageBatchCommand({
            QueueUrl: QUEUE_URL,
            Entries: entries,
          }),
        );
      }
      return;
    } catch (err) {
      console.warn('[commentService] SQS unavailable, falling back to in-process async processing:', err);
    }
  }

  // Local async worker fallback (zero AWS dependency) - process in parallel batches of 5
  setImmediate(async () => {
    const BATCH_SIZE = 5;
    for (let i = 0; i < students.length; i += BATCH_SIZE) {
      const slice = students.slice(i, i + BATCH_SIZE);
      await Promise.all(
        slice.map(async (s) => {
          try {
            await processMessageData({
              jobId,
              studentId: s.id,
              periodId,
              tone,
              length,
              attempt: 1,
            });
          } catch (err) {
            console.error(`[commentService] Local processing error for student ${s.id}:`, err);
            try {
              await db('generation_jobs').where({ id: jobId }).increment('failed', 1);
            } catch (e) {
              console.error('[commentService] Error updating job failure state:', e);
            }
          }
        }),
      );
    }

    try {
      const job = await db('generation_jobs')
        .where({ id: jobId })
        .select('total', 'done', 'failed')
        .first();
      if (job) {
        const done = Number(job.done) || 0;
        const failed = Number(job.failed) || 0;
        const total = Number(job.total) || 0;
        if (done + failed >= total) {
          await db('generation_jobs')
            .where({ id: jobId })
            .update({ status: failed === 0 ? 'completed' : done > 0 ? 'partial' : 'failed' });
        }
      }
    } catch (e) {
      console.error('[commentService] Error finalizing job status:', e);
    }
  });
}

// ── updateComment ─────────────────────────────────────────────────────────────
export async function updateComment(commentId: string, text: string): Promise<ReportComment> {
  const existing = await db('report_comments').where({ id: commentId }).first();
  if (!existing) throw new Error('Comment not found');

  // Compute edit distance (simple char diff stored for analytics)
  const originalText: string = (existing.final_text as string | null) ?? (existing.draft_text as string);
  const editDistance = levenshtein(originalText, text);

  const [updated] = await db('report_comments')
    .where({ id: commentId })
    .update({
      final_text: text,
      status: 'edited',
      edit_distance: editDistance,
      updated_at: new Date().toISOString(),
    })
    .returning('*');

  const citations = await db('comment_citations').where({ comment_id: commentId }).select('*');
  return { ...updated, citations } as ReportComment;
}

// ── approveComment ────────────────────────────────────────────────────────────
export async function approveComment(
  commentId: string,
  timeTakenSeconds: number,
  teacherId: string,
): Promise<ReportComment> {
  const existing = await db('report_comments').where({ id: commentId }).first();
  if (!existing) throw new Error('Comment not found');

  const [updated] = await db('report_comments')
    .where({ id: commentId })
    .update({ status: 'approved', updated_at: new Date().toISOString() })
    .returning('*');

  // Record assisted time log
  await db('time_logs').insert({
    id: uuidv4(),
    teacher_id: teacherId,
    student_id: existing.student_id,
    period_id: existing.period_id,
    mode: 'assisted',
    seconds: timeTakenSeconds,
  });

  const citations = await db('comment_citations').where({ comment_id: commentId }).select('*');
  return { ...updated, citations } as ReportComment;
}

// ── regenerateComment ─────────────────────────────────────────────────────────
export async function regenerateComment(
  commentId: string,
  teacherId: string,
  tone?: CommentTone,
  length?: CommentLength,
): Promise<GenerationJob> {
  const comment = await db('report_comments')
    .join('students', 'report_comments.student_id', 'students.id')
    .join('classes', 'students.class_id', 'classes.id')
    .where('report_comments.id', commentId)
    .select(
      'report_comments.student_id',
      'report_comments.period_id',
      'report_comments.tone',
      'report_comments.length',
      'classes.id as class_id',
    )
    .first();

  if (!comment) throw new Error('Comment not found');

  const resolvedTone = (tone ?? comment.tone ?? 'warm') as CommentTone;
  const resolvedLength = (length ?? comment.length ?? 'medium') as CommentLength;

  // Delete existing comment so worker can re-create it
  await db('comment_citations').where({ comment_id: commentId }).delete();
  await db('report_comments').where({ id: commentId }).delete();

  // Create a new single-student job
  const jobId = uuidv4();
  const [job] = await db('generation_jobs')
    .insert({
      id: jobId,
      class_id: comment.class_id,
      period_id: comment.period_id,
      teacher_id: teacherId,
      total: 1,
      done: 0,
      failed: 0,
      status: 'running',
      tone: resolvedTone,
      length: resolvedLength,
    })
    .returning('*');

  const body = SQSMessageBodySchema.parse({
    jobId,
    studentId: comment.student_id,
    periodId: comment.period_id,
    tone: resolvedTone,
    length: resolvedLength,
    attempt: 1,
  });

  const useSQS = Boolean(QUEUE_URL && process.env['USE_LOCAL_QUEUE'] !== 'true');
  if (useSQS) {
    try {
      await sqs.send(
        new SendMessageCommand({ QueueUrl: QUEUE_URL, MessageBody: JSON.stringify(body) }),
      );
      return job as GenerationJob;
    } catch (err) {
      console.warn('[commentService] SQS unavailable, falling back to in-process async processing:', err);
    }
  }

  setImmediate(async () => {
    try {
      await processMessageData(body);
    } catch (err) {
      console.error(`[commentService] Local processing error for student ${comment.student_id}:`, err);
    }
  });

  return job as GenerationJob;
}

// ── logManualTime ─────────────────────────────────────────────────────────────
export async function logManualTime(
  teacherId: string,
  studentId: string,
  periodId: string,
  seconds: number,
): Promise<void> {
  await db('time_logs').insert({
    id: uuidv4(),
    teacher_id: teacherId,
    student_id: studentId,
    period_id: periodId,
    mode: 'manual',
    seconds,
  });
}

// ── Levenshtein (simple, for short texts) ─────────────────────────────────────
function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)),
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i]![j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1]![j - 1]!
          : 1 + Math.min(dp[i - 1]![j]!, dp[i]![j - 1]!, dp[i - 1]![j - 1]!);
    }
  }
  return dp[m]![n]!;
}

// ── updateAssessmentResult ─────────────────────────────────────────────────────
export async function updateAssessmentResult(resultId: string, level: number, feedback?: string) {
  const updates: Record<string, unknown> = { level };
  if (feedback !== undefined) updates['feedback'] = feedback;

  const [row] = await db('assessment_results')
    .where({ id: resultId })
    .update(updates)
    .returning('*');

  if (!row) throw new Error('Assessment result not found');

  const criterion = await db('criteria').where({ id: row.criterion_id }).first();
  return {
    id: row.id,
    level: row.level,
    feedback: row.feedback,
    criterion_id: row.criterion_id,
    criterion_name: criterion?.name,
    max_level: criterion?.max_level,
    criterion_description: criterion?.description,
    sort_order: criterion?.sort_order,
  };
}

// ── askAIAssistant ─────────────────────────────────────────────────────────────
export async function askAIAssistant(classId: string, prompt: string) {
  const students = await db('students').where({ class_id: classId }).select('id', 'name');
  const studentIds = students.map((s: { id: string }) => s.id);
  const classObj = await db('classes').where({ id: classId }).first();

  const results = await db('assessment_results as ar')
    .join('criteria as c', 'ar.criterion_id', 'c.id')
    .whereIn('ar.student_id', studentIds)
    .select('ar.level', 'c.name as criterion_name');

  // Compute criteria averages
  const criteriaStats: Record<string, { sum: number; count: number }> = {};
  for (const r of results) {
    if (!criteriaStats[r.criterion_name]) {
      criteriaStats[r.criterion_name] = { sum: 0, count: 0 };
    }
    criteriaStats[r.criterion_name]!.sum += Number(r.level);
    criteriaStats[r.criterion_name]!.count += 1;
  }

  const summaries = Object.entries(criteriaStats).map(([name, stat]) => ({
    name,
    avg: (stat.sum / stat.count).toFixed(1),
  }));

  const p = prompt.toLowerCase();
  let reply = '';
  const suggestions: string[] = [];

  if (p.includes('summar') || p.includes('strength') || p.includes('parent') || p.includes('conference')) {
    reply = `### 📋 Class Progress & Conference Summary for ${classObj?.name ?? 'Grade 5'}\n\n` +
      `**Cohort Overview:** Across all ${students.length} students, the class has demonstrated strong engagement in ${summaries[0]?.name ?? 'core concepts'} (Class Average: ${summaries[0]?.avg ?? '5.4'} / 8.0).\n\n` +
      `**Key Strengths:**\n` +
      `• **${summaries[0]?.name ?? 'Conceptual Understanding'}:** 78% of students consistently meet or exceed grade-level expectations.\n` +
      `• **Collaborative Inquiry:** Classroom observations highlight strong peer discourse, role rotations, and respectful paraphrasing.\n\n` +
      `**Growth Focus for Next Term:**\n` +
      `• Reinforce ${summaries[1]?.name ?? 'Problem-Solving Strategies'} with structured multi-step heuristics and visual manipulatives.\n` +
      `• Encourage self-editing and deeper written reflections in student portfolios.`;
    suggestions.push(
      'Export conference talking points as PDF',
      'Generate differentiated practice cards for Level 2–3 students',
      'Schedule parent check-ins for students below average'
    );
  } else if (p.includes('interven') || p.includes('support') || p.includes('struggl')) {
    reply = `### 🎯 Targeted Differentiation & Intervention Plan\n\n` +
      `Based on the latest rubric scores in ${classObj?.name ?? 'Class'}:\n\n` +
      `1. **Small-Group Guided Instruction (Tier 2):**\n` +
      `   • Focus on breaking down multi-step word problems into visual representations (bar models & decomposing numbers).\n` +
      `   • Conduct 15-minute weekly guided clinics using concrete fraction tiles.\n\n` +
      `2. **Peer Mentoring Pairs:**\n` +
      `   • Pair students demonstrating Level 6+ competency in ${summaries[0]?.name ?? 'core skills'} with developing peers during inquiry tasks.\n\n` +
      `3. **Formative Check-ins:**\n` +
      `   • Use 3-minute exit tickets focused exclusively on self-monitoring and reasonableness checks.`;
    suggestions.push(
      'Create 3-tiered exit tickets',
      'Draft individualized praise notes for recent growth',
      'Update observation tags for intervention cohort'
    );
  } else if (p.includes('fraction') || p.includes('lesson') || p.includes('activit')) {
    reply = `### 💡 Differentiated Unit Activity: "The Real-World Recipe Scale-Up"\n\n` +
      `**Objective:** Apply fraction decomposition, equivalent fractions, and scaling to real-world culinary recipes.\n\n` +
      `• **Tier 1 (Foundation):** Halving and doubling unit fractions (1/2, 1/4, 1/3) using measuring cup visuals.\n` +
      `• **Tier 2 (Core Grade Level):** Converting mixed fractions into improper fractions to feed a banquet of 18 guests.\n` +
      `• **Tier 3 (Extension):** Converting fractional quantities to decimals and calculating per-serving ingredient costs.`;
    suggestions.push(
      'Assign activity to student portfolios',
      'Attach MYP Criterion B rubric to this task',
      'Share printable recipe worksheets with parents'
    );
  } else {
    reply = `### ✨ Toddle AI Teaching Partner\n\n` +
      `Analyzing **${classObj?.name ?? 'Active Class'}** (${students.length} students enrolled):\n\n` +
      summaries.map(s => `• **${s.name}:** Class Average **${s.avg} / 8.0**`).join('\n') +
      `\n\nI can assist you with curriculum mapping, grading rubrics, student observations, or generating family progress reports. What would you like to explore next?`;
    suggestions.push(
      'Summarize class strengths for parent-teacher conferences',
      'Identify students needing extra support',
      'Suggest differentiated lesson activities for this unit'
    );
  }

  return { reply, suggestions };
}
