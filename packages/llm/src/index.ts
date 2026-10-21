import type { EvidencePack, LLMResponse } from '@hourback/shared';

// ── Provider Interface ────────────────────────────────────────────────────────
export interface LLMProvider {
  readonly name: string;
  /**
   * Generate a grounded progress report comment.
   * @param pack - Evidence pack with tokenized student name
   * @param validatorFeedback - Optional feedback from first failed validation attempt
   * @returns Parsed LLM response (JSON with sentences + evidence_ids)
   */
  generate(pack: EvidencePack, validatorFeedback?: string): Promise<LLMResponse>;
}

// ── Provider Factory ──────────────────────────────────────────────────────────
export { GeminiProvider } from './providers/gemini';
export { AnthropicProvider } from './providers/anthropic';
export { MockProvider } from './providers/mock';

export function createProvider(name: string): LLMProvider {
  switch (name) {
    case 'gemini':
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      return new (require('./providers/gemini').GeminiProvider)();
    case 'anthropic':
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      return new (require('./providers/anthropic').AnthropicProvider)();
    case 'mock':
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      return new (require('./providers/mock').MockProvider)();
    default:
      throw new Error(`Unknown LLM provider: "${name}". Set LLM_PROVIDER to gemini | anthropic | mock`);
  }
}
