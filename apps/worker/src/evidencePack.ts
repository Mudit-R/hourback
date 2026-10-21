import type { EvidencePack, EvidenceItem, CommentTone, CommentLength } from '@hourback/shared';

interface AssessmentResultRow {
  id: string;
  criterion_id: string;
  level: number;
  feedback: string | null;
  criterion_name: string;
  max_level: number;
}

interface ObservationRow {
  id: string;
  text: string;
  tag: string | null;
  created_at: Date;
}

interface PeriodRow {
  name: string;
}

interface ClassRow {
  subject: string;
  grade: string;
}

/**
 * Builds an EvidencePack from raw DB rows.
 * The student name has already been tokenized before this function is called.
 */
export function buildEvidencePack(params: {
  studentToken: string;
  assessmentResults: AssessmentResultRow[];
  observations: ObservationRow[];
  period: PeriodRow;
  classData: ClassRow;
  tone: CommentTone;
  length: CommentLength;
}): EvidencePack {
  const { studentToken, assessmentResults, observations, period, classData, tone, length } = params;

  const items: EvidenceItem[] = [
    ...assessmentResults.map((ar): EvidenceItem => ({
      id: ar.id,
      type: 'assessment_result',
      content: `${ar.criterion_name}: Level ${ar.level}/${ar.max_level}${ar.feedback ? `. Teacher note: ${ar.feedback}` : ''}`,
      criterionName: ar.criterion_name,
      level: ar.level,
      maxLevel: ar.max_level,
    })),
    ...observations.map((obs): EvidenceItem => ({
      id: obs.id,
      type: 'observation',
      content: obs.text,
      tag: obs.tag ?? undefined,
    })),
  ];

  return {
    studentToken,
    items,
    tone,
    length,
    periodName: period.name,
    subject: classData.subject,
    grade: classData.grade,
  };
}
