import DataLoader from 'dataloader';
import db from '../db/client';

// ── Types ──────────────────────────────────────────────────────────────────
export interface StudentRow {
  id: string;
  class_id: string;
  name: string;
  preferred_name: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface AssessmentResultRow {
  id: string;
  student_id: string;
  criterion_id: string;
  level: number;
  feedback: string | null;
}

export interface ObservationRow {
  id: string;
  student_id: string;
  text: string;
  tag: string | null;
  created_at: Date;
}

// ── DataLoader instances ───────────────────────────────────────────────────
/**
 * Batches assessment results by student ID.
 * Without this: N queries (one per student). With: 1 query for all.
 */
function createAssessmentResultsLoader() {
  return new DataLoader<string, Record<string, unknown>[]>(async (studentIds) => {
    const rows = await db('assessment_results as ar')
      .join('criteria as c', 'ar.criterion_id', 'c.id')
      .whereIn('ar.student_id', studentIds as string[])
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
      .orderBy('c.sort_order', 'asc');

    const byStudent = new Map<string, Record<string, unknown>[]>();
    for (const row of rows) {
      const studentId = row.student_id as string;
      const list = byStudent.get(studentId) ?? [];
      list.push(row);
      byStudent.set(studentId, list);
    }

    return studentIds.map((id) => byStudent.get(id) ?? []);
  });
}

/**
 * Batches observations by student ID.
 */
function createObservationsLoader() {
  return new DataLoader<string, Record<string, unknown>[]>(async (studentIds) => {
    const rows = await db('observations')
      .whereIn('student_id', studentIds as string[])
      .orderBy('created_at', 'desc')
      .select('*');

    const byStudent = new Map<string, Record<string, unknown>[]>();
    for (const row of rows) {
      const studentId = row.student_id as string;
      const list = byStudent.get(studentId) ?? [];
      list.push(row);
      byStudent.set(studentId, list);
    }

    return studentIds.map((id) => byStudent.get(id) ?? []);
  });
}

/**
 * Batches report comments by composite key "studentId:periodId".
 */
function createReportCommentLoader() {
  return new DataLoader<string, Record<string, unknown> | null>(async (keys) => {
    // Keys are "studentId:periodId"
    const pairs = keys.map((k) => {
      const [studentId, periodId] = k.split(':');
      return { studentId: studentId as string, periodId: periodId as string };
    });

    const rows = await db('report_comments')
      .where((qb) => {
        for (const { studentId, periodId } of pairs) {
          qb.orWhere({ student_id: studentId, period_id: periodId });
        }
      })
      .select('*');

    const byKey = new Map<string, Record<string, unknown>>();
    for (const row of rows) {
      const key = `${row.student_id as string}:${row.period_id as string}`;
      byKey.set(key, row as Record<string, unknown>);
    }

    return keys.map((k) => byKey.get(k) ?? null);
  });
}

// ── Exported factory ───────────────────────────────────────────────────────
export interface DataLoaders {
  assessmentResults: ReturnType<typeof createAssessmentResultsLoader>;
  observations: ReturnType<typeof createObservationsLoader>;
  reportComments: ReturnType<typeof createReportCommentLoader>;
}

export function createLoaders(): DataLoaders {
  return {
    assessmentResults: createAssessmentResultsLoader(),
    observations: createObservationsLoader(),
    reportComments: createReportCommentLoader(),
  };
}
