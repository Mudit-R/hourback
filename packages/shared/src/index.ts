import { z } from 'zod';

// ── Evidence Pack (sent to worker, then to LLM) ──────────────────────────────
export const EvidenceItemSchema = z.object({
  id: z.string().uuid(),
  type: z.enum(['observation', 'assessment_result']),
  content: z.string().min(1),
  tag: z.string().optional(),
  criterionName: z.string().optional(),  // for assessment_result
  level: z.number().int().min(1).max(8).optional(),
  maxLevel: z.number().int().min(1).max(8).optional(),
});

export type EvidenceItem = z.infer<typeof EvidenceItemSchema>;

export const EvidencePackSchema = z.object({
  /** Opaque token replacing the real student name — e.g. STUDENT_1 */
  studentToken: z.string(),
  items: z.array(EvidenceItemSchema).min(1),
  tone: z.enum(['warm', 'formal', 'encouraging']),
  length: z.enum(['short', 'medium', 'long']),
  periodName: z.string(),
  subject: z.string(),
  grade: z.string(),
});

export type EvidencePack = z.infer<typeof EvidencePackSchema>;

// ── LLM Response ─────────────────────────────────────────────────────────────
export const LLMSentenceSchema = z.object({
  text: z.string().min(10),
  evidence_ids: z.array(z.string().uuid()).min(1),
});

export const LLMResponseSchema = z.object({
  sentences: z.array(LLMSentenceSchema).min(1).max(20),
});

export type LLMSentence = z.infer<typeof LLMSentenceSchema>;
export type LLMResponse = z.infer<typeof LLMResponseSchema>;

// ── SQS Message ───────────────────────────────────────────────────────────────
export const SQSMessageBodySchema = z.object({
  jobId: z.string().uuid(),
  studentId: z.string().uuid(),
  periodId: z.string().uuid(),
  tone: z.enum(['warm', 'formal', 'encouraging']),
  length: z.enum(['short', 'medium', 'long']),
  attempt: z.number().int().min(1).default(1),
});

export type SQSMessageBody = z.infer<typeof SQSMessageBodySchema>;

// ── DB Row Types (for cross-package use) ──────────────────────────────────────
export interface Teacher {
  id: string;
  name: string;
  email: string;
  school: string;
  created_at: Date;
  updated_at: Date;
}

export interface Class {
  id: string;
  teacher_id: string;
  name: string;
  grade: string;
  subject: string;
  academic_year: string;
  created_at: Date;
  updated_at: Date;
}

export interface Student {
  id: string;
  class_id: string;
  name: string;
  preferred_name: string | null;
  created_at: Date;
  updated_at: Date;
}

export type CommentStatus = 'draft' | 'edited' | 'approved' | 'flagged';
export type JobStatus = 'pending' | 'running' | 'completed' | 'partial' | 'failed';
export type CommentTone = 'warm' | 'formal' | 'encouraging';
export type CommentLength = 'short' | 'medium' | 'long';

export interface ReportComment {
  id: string;
  student_id: string;
  period_id: string;
  job_id: string | null;
  draft_text: string;
  final_text: string | null;
  status: CommentStatus;
  model: string | null;
  groundedness_score: number | null;
  edit_distance: number | null;
  generation_ms: number | null;
  tone: CommentTone | null;
  length: CommentLength | null;
  created_at: Date;
  updated_at: Date;
}

export interface GenerationJob {
  id: string;
  class_id: string;
  period_id: string;
  teacher_id: string;
  total: number;
  done: number;
  failed: number;
  status: JobStatus;
  tone: CommentTone;
  length: CommentLength;
  created_at: Date;
  updated_at: Date;
}
