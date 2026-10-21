import {
  validateLLMResponse,
  buildValidatorFeedback,
  computeGroundednessScore,
} from '../validator';
import type { EvidencePack, LLMResponse } from '@hourback/shared';

const pack: EvidencePack = {
  studentToken: 'STUDENT_1',
  tone: 'warm',
  length: 'medium', // min 2, max 5 sentences
  periodName: 'Semester 1',
  subject: 'Mathematics',
  grade: 'Grade 5',
  items: [
    {
      id: '11111111-1111-1111-1111-111111111111',
      type: 'assessment_result',
      content: 'Mastered fraction addition',
      level: 6,
      maxLevel: 8,
    },
    {
      id: '22222222-2222-2222-2222-222222222222',
      type: 'observation',
      content: 'Active participant in small group math inquiries',
      tag: 'collaboration',
    },
  ],
};

describe('Worker Validator', () => {
  it('validates a compliant LLM response with proper citations', () => {
    const response: LLMResponse = {
      sentences: [
        {
          text: 'STUDENT_1 has shown commendable growth in understanding fraction operations.',
          evidence_ids: ['11111111-1111-1111-1111-111111111111'],
        },
        {
          text: 'STUDENT_1 consistently contributes thoughtful explanations during collaborative problem-solving.',
          evidence_ids: ['22222222-2222-2222-2222-222222222222'],
        },
      ],
    };

    const result = validateLLMResponse(response, pack);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);

    const score = computeGroundednessScore(response, pack);
    expect(score).toBe(1.0); // 2 of 2 items cited
  });

  it('rejects deficit-labelling language', () => {
    const response: LLMResponse = {
      sentences: [
        {
          text: 'STUDENT_1 is struggling and weak at fraction addition.',
          evidence_ids: ['11111111-1111-1111-1111-111111111111'],
        },
        {
          text: 'STUDENT_1 participated in group work today.',
          evidence_ids: ['22222222-2222-2222-2222-222222222222'],
        },
      ],
    };

    const result = validateLLMResponse(response, pack);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('deficit label'))).toBe(true);
  });

  it('rejects comparative language between students', () => {
    const response: LLMResponse = {
      sentences: [
        {
          text: 'STUDENT_1 is much better than other students in calculations.',
          evidence_ids: ['11111111-1111-1111-1111-111111111111'],
        },
        {
          text: 'STUDENT_1 works well in groups.',
          evidence_ids: ['22222222-2222-2222-2222-222222222222'],
        },
      ],
    };

    const result = validateLLMResponse(response, pack);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('student comparison'))).toBe(true);
  });

  it('rejects sentences with no evidence citations (groundedness violation)', () => {
    const response: LLMResponse = {
      sentences: [
        {
          text: 'STUDENT_1 showed good mathematical intuition.',
          evidence_ids: [],
        },
        {
          text: 'STUDENT_1 participates well in classroom activities.',
          evidence_ids: ['22222222-2222-2222-2222-222222222222'],
        },
      ],
    };

    const result = validateLLMResponse(response, pack);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('groundedness violation'))).toBe(true);
  });

  it('rejects invalid evidence IDs that do not exist in the evidence pack', () => {
    const response: LLMResponse = {
      sentences: [
        {
          text: 'STUDENT_1 completed the math unit on fractions.',
          evidence_ids: ['99999999-9999-9999-9999-999999999999'], // halluncinated ID
        },
        {
          text: 'STUDENT_1 contributed regularly to peer inquiries.',
          evidence_ids: ['22222222-2222-2222-2222-222222222222'],
        },
      ],
    };

    const result = validateLLMResponse(response, pack);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('not found in evidence pack'))).toBe(true);
  });

  it('builds structured validator feedback for LLM retry prompt', () => {
    const errors = ['Sentence 0: contains deficit label "weak"'];
    const feedback = buildValidatorFeedback(errors);
    expect(feedback).toContain('The previous response failed validation');
    expect(feedback).toContain('contains deficit label "weak"');
  });
});
