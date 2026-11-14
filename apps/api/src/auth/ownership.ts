import { GraphQLError } from 'graphql';
import db from '../db/client';

function unavailable(): GraphQLError {
  // Keep missing and out-of-scope IDs indistinguishable to callers.
  return new GraphQLError('Resource not found', {
    extensions: { code: 'NOT_FOUND' },
  });
}

export async function assertClassOwned(teacherId: string, classId: string): Promise<void> {
  const row = await db('classes').where({ id: classId, teacher_id: teacherId }).first('id');
  if (!row) throw unavailable();
}

export async function assertClassPeriodOwned(
  teacherId: string,
  classId: string,
  periodId: string,
): Promise<void> {
  const row = await db('report_periods as rp')
    .join('classes as c', 'c.id', 'rp.class_id')
    .where({ 'rp.id': periodId, 'rp.class_id': classId, 'c.teacher_id': teacherId })
    .first('rp.id');
  if (!row) throw unavailable();
}

export async function assertStudentOwned(teacherId: string, studentId: string): Promise<void> {
  const row = await db('students as s')
    .join('classes as c', 'c.id', 's.class_id')
    .where({ 's.id': studentId, 'c.teacher_id': teacherId })
    .first('s.id');
  if (!row) throw unavailable();
}

export async function assertStudentPeriodOwned(
  teacherId: string,
  studentId: string,
  periodId: string,
): Promise<void> {
  const row = await db('students as s')
    .join('classes as c', 'c.id', 's.class_id')
    .join('report_periods as rp', 'rp.class_id', 's.class_id')
    .where({ 's.id': studentId, 'rp.id': periodId, 'c.teacher_id': teacherId })
    .first('s.id');
  if (!row) throw unavailable();
}

export async function assertCommentOwned(teacherId: string, commentId: string): Promise<void> {
  const row = await db('report_comments as rc')
    .join('students as s', 's.id', 'rc.student_id')
    .join('classes as c', 'c.id', 's.class_id')
    .where({ 'rc.id': commentId, 'c.teacher_id': teacherId })
    .first('rc.id');
  if (!row) throw unavailable();
}

export async function assertAssessmentResultOwned(teacherId: string, resultId: string): Promise<void> {
  const row = await db('assessment_results as ar')
    .join('students as s', 's.id', 'ar.student_id')
    .join('classes as c', 'c.id', 's.class_id')
    .join('criteria as cr', 'cr.id', 'ar.criterion_id')
    .join('assessments as a', 'a.id', 'cr.assessment_id')
    .join('units as u', 'u.id', 'a.unit_id')
    .where({ 'ar.id': resultId, 'c.teacher_id': teacherId })
    .whereRaw('u.class_id = s.class_id')
    .first('ar.id');
  if (!row) throw unavailable();
}

export async function assertJobOwned(teacherId: string, jobId: string): Promise<void> {
  const row = await db('generation_jobs').where({ id: jobId, teacher_id: teacherId }).first('id');
  if (!row) throw unavailable();
}
