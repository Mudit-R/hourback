import { GraphQLError } from 'graphql';
import type { GraphQLContext } from '../types/context';
import * as svc from '../services/commentService';
import {
  AddObservationInput,
  GenerateCommentsInput,
  UpdateCommentInput,
  ApproveCommentInput,
  RegenerateCommentInput,
  LogManualTimeInput,
} from '../validation/schemas';
import { toGraphQLError } from '../validation/errors';

import db from '../db/client';

// ── helpers ───────────────────────────────────────────────────────────────────
function requireTeacher(ctx: GraphQLContext): string {
  if (!ctx.teacherId) {
    throw new GraphQLError('Authentication required', {
      extensions: { code: 'UNAUTHENTICATED' },
    });
  }
  return ctx.teacherId;
}

// ── DB row → GQL shape mappers ────────────────────────────────────────────────
function mapClass(row: Record<string, unknown>) {
  return {
    id: row['id'],
    name: row['name'],
    grade: row['grade'],
    subject: row['subject'],
    academicYear: row['academic_year'],
    teacher: { id: row['teacher_id'] },
  };
}

function mapPeriod(row: Record<string, unknown>) {
  return {
    id: row['id'],
    name: row['name'],
    startDate: row['start_date'],
    endDate: row['end_date'],
  };
}

function mapStudent(row: Record<string, unknown>) {
  return {
    id: row['id'],
    name: row['name'],
    preferredName: row['preferred_name'] ?? null,
    class: { id: row['class_id'] },
  };
}

function mapObservation(row: Record<string, unknown>) {
  return {
    id: row['id'],
    text: row['text'],
    tag: row['tag'] ?? null,
    createdAt: row['created_at'],
  };
}

function mapAssessmentResult(row: Record<string, unknown>) {
  return {
    id: row['id'],
    level: row['level'],
    feedback: row['feedback'] ?? null,
    criterion: {
      id: row['criterion_id'],
      name: row['criterion_name'],
      maxLevel: row['max_level'],
      description: row['criterion_description'] ?? null,
      sortOrder: row['sort_order'] ?? 0,
    },
  };
}

function mapComment(row: Record<string, unknown>) {
  return {
    id: row['id'],
    draftText: row['draft_text'],
    finalText: row['final_text'] ?? null,
    status: row['status'],
    model: row['model'] ?? null,
    groundednessScore: row['groundedness_score'] ?? null,
    editDistance: row['edit_distance'] ?? null,
    generationMs: row['generation_ms'] ?? null,
    tone: row['tone'] ?? null,
    length: row['length'] ?? null,
    citations: (row['citations'] as unknown[]) ?? [],
    createdAt: row['created_at'],
    updatedAt: row['updated_at'],
    student: { id: row['student_id'] },
    period: { id: row['period_id'] },
  };
}

// ── Resolvers ─────────────────────────────────────────────────────────────────
export const resolvers = {
  Query: {
    me: async (_parent: unknown, _args: unknown, ctx: GraphQLContext) => {
      const teacherId = requireTeacher(ctx);
      const teacher = await db('teachers').where({ id: teacherId }).first();
      return teacher ?? null;
    },

    classes: async (_parent: unknown, _args: unknown, ctx: GraphQLContext) => {
      const teacherId = requireTeacher(ctx);
      const rows = await db('classes').where({ teacher_id: teacherId }).orderBy('name', 'asc');
      return rows.map(mapClass);
    },

    classRoster: async (
      _parent: unknown,
      args: { classId: string; periodId: string },
      ctx: GraphQLContext,
    ) => {
      requireTeacher(ctx);
      const students = await svc.getClassRoster(args.classId, args.periodId);
      return students.map(mapStudent);
    },

    studentEvidence: async (
      _parent: unknown,
      args: { studentId: string },
      ctx: GraphQLContext,
    ) => {
      requireTeacher(ctx);
      const ev = await svc.getStudentEvidence(args.studentId);
      return {
        assessmentResults: ev.assessmentResults.map(mapAssessmentResult),
        observations: ev.observations.map(mapObservation),
      };
    },

    reportComment: async (
      _parent: unknown,
      args: { studentId: string; periodId: string },
      ctx: GraphQLContext,
    ) => {
      requireTeacher(ctx);
      const comment = await svc.getReportComment(args.studentId, args.periodId);
      if (!comment) return null;
      return mapComment(comment as Record<string, unknown>);
    },

    timeSavedSummary: async (
      _parent: unknown,
      args: { classId: string; periodId: string },
      ctx: GraphQLContext,
    ) => {
      requireTeacher(ctx);
      return svc.getTimeSavedSummary(args.classId, args.periodId);
    },

    generationJob: async (
      _parent: unknown,
      args: { jobId: string },
      ctx: GraphQLContext,
    ) => {
      requireTeacher(ctx);
      return svc.getGenerationJob(args.jobId);
    },
  },

  Mutation: {
    addObservation: async (
      _parent: unknown,
      args: { studentId: string; text: string; tag?: string },
      ctx: GraphQLContext,
    ) => {
      requireTeacher(ctx);
      const parsed = AddObservationInput.safeParse(args);
      if (!parsed.success) throw toGraphQLError(parsed.error);
      const row = await svc.addObservation(parsed.data.studentId, parsed.data.text, parsed.data.tag);
      return mapObservation(row as Record<string, unknown>);
    },

    generateComments: async (
      _parent: unknown,
      args: { classId: string; periodId: string; tone: string; length: string },
      ctx: GraphQLContext,
    ) => {
      const teacherId = requireTeacher(ctx);
      const parsed = GenerateCommentsInput.safeParse(args);
      if (!parsed.success) throw toGraphQLError(parsed.error);
      return svc.generateComments(
        parsed.data.classId,
        parsed.data.periodId,
        teacherId,
        parsed.data.tone,
        parsed.data.length,
      );
    },

    updateComment: async (
      _parent: unknown,
      args: { commentId: string; text: string },
      ctx: GraphQLContext,
    ) => {
      requireTeacher(ctx);
      const parsed = UpdateCommentInput.safeParse(args);
      if (!parsed.success) throw toGraphQLError(parsed.error);
      const comment = await svc.updateComment(parsed.data.commentId, parsed.data.text);
      return mapComment(comment as unknown as Record<string, unknown>);
    },

    approveComment: async (
      _parent: unknown,
      args: { commentId: string; timeTakenSeconds: number },
      ctx: GraphQLContext,
    ) => {
      const teacherId = requireTeacher(ctx);
      const parsed = ApproveCommentInput.safeParse(args);
      if (!parsed.success) throw toGraphQLError(parsed.error);
      const comment = await svc.approveComment(parsed.data.commentId, parsed.data.timeTakenSeconds, teacherId);
      return mapComment(comment as unknown as Record<string, unknown>);
    },

    regenerateComment: async (
      _parent: unknown,
      args: { commentId: string; tone?: string; length?: string },
      ctx: GraphQLContext,
    ) => {
      const teacherId = requireTeacher(ctx);
      const parsed = RegenerateCommentInput.safeParse(args);
      if (!parsed.success) throw toGraphQLError(parsed.error);
      return svc.regenerateComment(parsed.data.commentId, teacherId, parsed.data.tone, parsed.data.length);
    },

    logManualTime: async (
      _parent: unknown,
      args: { studentId: string; periodId: string; seconds: number },
      ctx: GraphQLContext,
    ) => {
      const teacherId = requireTeacher(ctx);
      const parsed = LogManualTimeInput.safeParse(args);
      if (!parsed.success) throw toGraphQLError(parsed.error);
      await svc.logManualTime(teacherId, parsed.data.studentId, parsed.data.periodId, parsed.data.seconds);
      return true;
    },
  },

  // Student sub-fields resolved using DataLoader
  Student: {
    evidence: async (parent: { id: string }, _args: unknown, ctx: GraphQLContext) => {
      const [assessmentResults, observations] = await Promise.all([
        ctx.loaders.assessmentResults.load(parent.id),
        ctx.loaders.observations.load(parent.id),
      ]);
      return {
        assessmentResults: assessmentResults.map(mapAssessmentResult),
        observations: observations.map(mapObservation),
      };
    },

    reportComment: async (
      parent: { id: string },
      args: { periodId: string },
      ctx: GraphQLContext,
    ) => {
      const key = `${parent.id}:${args.periodId}`;
      const comment = await ctx.loaders.reportComments.load(key);
      if (!comment) return null;
      return mapComment(comment);
    },
  },

  // Teacher sub-fields
  Teacher: {
    classes: async (parent: { id: string }) => {
      const rows = await db('classes').where({ teacher_id: parent.id }).orderBy('name', 'asc');
      return rows.map(mapClass);
    },
  },

  // Class sub-fields
  Class: {
    teacher: async (parent: { teacher?: { id: string }; teacher_id?: string }) => {
      const teacherId = parent.teacher?.id ?? parent.teacher_id;
      return db('teachers').where({ id: teacherId }).first();
    },
    reportPeriods: async (parent: { id: string }) => {
      const rows = await db('report_periods').where({ class_id: parent.id }).orderBy('start_date', 'asc');
      return rows.map(mapPeriod);
    },
    students: async (parent: { id: string }) => {
      const rows = await db('students').where({ class_id: parent.id }).orderBy('name', 'asc');
      return rows.map(mapStudent);
    },
  },

  Subscription: {
    commentJobProgress: {
      subscribe: () => {
        throw new GraphQLError(
          'Subscription transport not active — use polling via generationJob query',
          { extensions: { code: 'NOT_IMPLEMENTED' } },
        );
      },
    },
  },
};
