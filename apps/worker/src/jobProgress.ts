import type { Knex } from 'knex';

export interface GenerationTarget {
  jobId: string;
  studentId: string;
  periodId: string;
}

export type GenerationOutcome = 'done' | 'failed';

interface Progress {
  total: number;
  done: number;
  failed: number;
}

/**
 * Settle a student once per job. Drafts, citations, and the resulting progress
 * update share the same transaction. The model call stays outside this lock.
 *
 * Returns false when the callback has no outcome yet, so the caller can
 * generate or retry the draft. Finished and duplicate jobs are acknowledged.
 */
export async function settleGeneration(
  db: Knex,
  { jobId, studentId, periodId }: GenerationTarget,
  writeOutcome: (trx: Knex.Transaction) => Promise<GenerationOutcome | undefined>,
): Promise<boolean> {
  return db.transaction(async (trx) => {
    const job = await trx<Progress>('generation_jobs')
      .where('id', jobId)
      .where('period_id', periodId)
      .whereIn('status', ['pending', 'running'])
      .whereExists(
        trx('students')
          .select('id')
          .where({ id: studentId })
          .whereRaw('students.class_id = generation_jobs.class_id'),
      )
      .forUpdate()
      .first('total', 'done', 'failed');

    if (!job || job.done + job.failed >= job.total) return true;

    const resultKey = { job_id: jobId, student_id: studentId };
    if (await trx('generation_job_results').where(resultKey).first('outcome')) return true;

    const outcome = await writeOutcome(trx);
    if (!outcome) return false;

    await trx('generation_job_results').insert({ ...resultKey, outcome });

    const done = job.done + Number(outcome === 'done');
    const failed = job.failed + Number(outcome === 'failed');
    let status = 'running';
    if (done + failed === job.total) {
      if (failed === 0) status = 'completed';
      else status = done === 0 ? 'failed' : 'partial';
    }
    await trx('generation_jobs').where({ id: jobId }).update({ done, failed, status });
    return true;
  });
}

export async function outcomeOfExistingDraft(
  trx: Knex.Transaction,
  studentId: string,
  periodId: string,
): Promise<GenerationOutcome | undefined> {
  const comment = await trx<{
    status: string;
    student_id: string;
    period_id: string;
  }>('report_comments')
    .where({ student_id: studentId, period_id: periodId })
    .forShare()
    .first('status');
  if (!comment) return undefined;
  return comment.status === 'flagged' ? 'failed' : 'done';
}
