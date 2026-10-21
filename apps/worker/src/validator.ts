import type { EvidencePack, LLMResponse } from '@hourback/shared';
import { LLMResponseSchema } from '@hourback/shared';
import type { LLMProvider } from '@hourback/llm';

const LENGTH_LIMITS: Record<string, { min: number; max: number }> = {
  short: { min: 1, max: 3 },
  medium: { min: 2, max: 5 },
  long: { min: 4, max: 8 },
};

const DEFICIT_LABELS = [
  'lazy', 'weak', 'slow', 'struggling', 'behind', 'poor', 'bad',
  'difficult', 'trouble', 'fail', 'failed', 'failing', 'cannot', "can't",
  'unable', 'incapable', 'limited', 'lacks', 'lacking',
];

// Phrases that compare students — prohibited
const COMPARISON_PHRASES = [
  'better than', 'worse than', 'unlike', 'compared to other',
  'most students', 'other students', 'rest of the class',
];

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Pure, deterministic validator — no LLM call.
 * Checks every sentence in the LLM response against the evidence pack.
 */
export function validateLLMResponse(
  response: LLMResponse,
  pack: EvidencePack,
): ValidationResult {
  const errors: string[] = [];
  const evidenceIds = new Set(pack.items.map((i) => i.id));
  const lengthLimit = LENGTH_LIMITS[pack.length] ?? LENGTH_LIMITS['medium']!;

  // 1. Sentence count
  const count = response.sentences.length;
  if (count < lengthLimit.min || count > lengthLimit.max) {
    errors.push(
      `Sentence count ${count} out of range [${lengthLimit.min}, ${lengthLimit.max}] for length="${pack.length}"`,
    );
  }

  for (let i = 0; i < response.sentences.length; i++) {
    const sentence = response.sentences[i]!;
    const sText = sentence.text.toLowerCase();

    // 2. Every evidence_id must exist in the pack
    for (const eid of sentence.evidence_ids) {
      if (!evidenceIds.has(eid)) {
        errors.push(`Sentence ${i}: evidence_id "${eid}" not found in evidence pack`);
      }
    }

    // 3. No evidence_ids → hallucination risk
    if (sentence.evidence_ids.length === 0) {
      errors.push(`Sentence ${i}: has no evidence_ids (groundedness violation)`);
    }

    // 4. Deficit-labelling language
    for (const label of DEFICIT_LABELS) {
      if (sText.includes(label)) {
        errors.push(`Sentence ${i}: contains deficit label "${label}"`);
      }
    }

    // 5. Student comparison language
    for (const phrase of COMPARISON_PHRASES) {
      if (sText.includes(phrase)) {
        errors.push(`Sentence ${i}: contains student comparison phrase "${phrase}"`);
      }
    }

    // 6. Must not be empty
    if (sentence.text.trim().length < 10) {
      errors.push(`Sentence ${i}: text too short (<10 chars)`);
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Formats validator errors into a feedback string injected into the retry prompt.
 */
export function buildValidatorFeedback(errors: string[]): string {
  return (
    'The previous response failed validation for the following reasons:\n' +
    errors.map((e) => `- ${e}`).join('\n') +
    '\n\nPlease fix these issues and return a corrected JSON response.'
  );
}

/**
 * Compute groundedness score: fraction of evidence items cited at least once.
 */
export function computeGroundednessScore(response: LLMResponse, pack: EvidencePack): number {
  const cited = new Set<string>();
  for (const s of response.sentences) {
    for (const eid of s.evidence_ids) {
      cited.add(eid);
    }
  }
  const packIds = pack.items.map((i) => i.id);
  const citedCount = packIds.filter((id) => cited.has(id)).length;
  return packIds.length > 0 ? citedCount / packIds.length : 0;
}

// Re-export LLMResponseSchema parse for worker use
export { LLMResponseSchema };
export type { LLMProvider };
