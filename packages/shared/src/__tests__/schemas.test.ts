import {
  EvidencePackSchema,
  LLMResponseSchema,
  SQSMessageBodySchema,
} from '../index';

describe('Shared Zod Schemas', () => {
  it('validates a correct SQS message body schema', () => {
    const validBody = {
      jobId: '123e4567-e89b-12d3-a456-426614174000',
      studentId: '123e4567-e89b-12d3-a456-426614174001',
      periodId: '123e4567-e89b-12d3-a456-426614174002',
      tone: 'warm',
      length: 'medium',
      attempt: 1,
    };

    const parsed = SQSMessageBodySchema.safeParse(validBody);
    expect(parsed.success).toBe(true);
  });

  it('rejects invalid tone or length in SQS message body', () => {
    const invalidBody = {
      jobId: '123e4567-e89b-12d3-a456-426614174000',
      studentId: '123e4567-e89b-12d3-a456-426614174001',
      periodId: '123e4567-e89b-12d3-a456-426614174002',
      tone: 'aggressive', // invalid
      length: 'extra-long', // invalid
    };

    const parsed = SQSMessageBodySchema.safeParse(invalidBody);
    expect(parsed.success).toBe(false);
  });

  it('validates structured LLMResponseSchema with sentence citations', () => {
    const validResponse = {
      sentences: [
        {
          text: 'STUDENT_1 participated actively in science inquiry.',
          evidence_ids: ['123e4567-e89b-12d3-a456-426614174000'],
        },
      ],
    };

    const parsed = LLMResponseSchema.safeParse(validResponse);
    expect(parsed.success).toBe(true);
  });

  it('validates EvidencePackSchema', () => {
    const validPack = {
      studentToken: 'STUDENT_1',
      items: [
        {
          id: '123e4567-e89b-12d3-a456-426614174000',
          type: 'observation' as const,
          content: 'Exceeded expectations in problem solving',
          tag: 'math',
        },
      ],
      tone: 'warm' as const,
      length: 'medium' as const,
      periodName: 'Semester 1',
      subject: 'Math',
      grade: 'Grade 5',
    };

    const parsed = EvidencePackSchema.safeParse(validPack);
    expect(parsed.success).toBe(true);
  });
});
