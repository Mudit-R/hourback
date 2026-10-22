import { z } from 'zod';

export const AddObservationInput = z.object({
  studentId: z.string().uuid('Invalid student ID'),
  text: z.string().min(10, 'Observation must be at least 10 characters').max(2000),
  tag: z.string().max(100).optional(),
});

export const GenerateCommentsInput = z.object({
  classId: z.string().uuid('Invalid class ID'),
  periodId: z.string().uuid('Invalid period ID'),
  tone: z.enum(['warm', 'formal', 'encouraging']),
  length: z.enum(['short', 'medium', 'long']),
});

export const UpdateCommentInput = z.object({
  commentId: z.string().uuid('Invalid comment ID'),
  text: z.string().min(20, 'Comment too short').max(5000),
});

export const ApproveCommentInput = z.object({
  commentId: z.string().uuid('Invalid comment ID'),
  timeTakenSeconds: z.number().int().min(0).max(86400),
});

export const RegenerateCommentInput = z.object({
  commentId: z.string().uuid('Invalid comment ID'),
  tone: z.enum(['warm', 'formal', 'encouraging']).optional(),
  length: z.enum(['short', 'medium', 'long']).optional(),
});

export const LogManualTimeInput = z.object({
  studentId: z.string().uuid(),
  periodId: z.string().uuid(),
  seconds: z.number().int().min(0).max(86400),
});

export const UpdateAssessmentResultInput = z.object({
  resultId: z.string().uuid('Invalid result ID'),
  level: z.number().int().min(1).max(8),
  feedback: z.string().max(2000).optional(),
});

export type AddObservationInputType = z.infer<typeof AddObservationInput>;
export type GenerateCommentsInputType = z.infer<typeof GenerateCommentsInput>;
export type UpdateCommentInputType = z.infer<typeof UpdateCommentInput>;
export type ApproveCommentInputType = z.infer<typeof ApproveCommentInput>;
export type UpdateAssessmentResultInputType = z.infer<typeof UpdateAssessmentResultInput>;
