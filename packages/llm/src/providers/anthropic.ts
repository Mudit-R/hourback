// Stub — full implementation in Phase 3
import type { LLMProvider } from '../index';
import type { EvidencePack, LLMResponse } from '@hourback/shared';

export class AnthropicProvider implements LLMProvider {
  readonly name = 'anthropic';

  async generate(_pack: EvidencePack, _validatorFeedback?: string): Promise<LLMResponse> {
    throw new Error('AnthropicProvider not implemented yet — Phase 3');
  }
}
