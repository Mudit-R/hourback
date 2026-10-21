import type { LLMProvider } from '../index';
import type { EvidencePack, LLMResponse } from '@hourback/shared';

/**
 * Deterministic mock provider for tests and CI.
 * Always returns a valid response that cites the first N evidence items.
 * Supports adversarial modes via env var MOCK_PROVIDER_MODE.
 */
export class MockProvider implements LLMProvider {
  readonly name = 'mock';

  constructor(private readonly mode: string = process.env['MOCK_PROVIDER_MODE'] ?? 'valid') {}

  async generate(pack: EvidencePack, _validatorFeedback?: string): Promise<LLMResponse> {
    // Simulate a small delay (realistic for tests)
    await new Promise((resolve) => setTimeout(resolve, 50));

    switch (this.mode) {
      case 'valid':
        return this.validResponse(pack);
      case 'invalid_evidence':
        return this.invalidEvidenceIds(pack);
      case 'deficit_language':
        return this.deficitLanguageResponse(pack);
      case 'comparison':
        return this.comparisonResponse(pack);
      case 'too_long':
        return this.tooLongResponse(pack);
      case 'no_citations':
        return this.noCitationsResponse(pack);
      default:
        return this.validResponse(pack);
    }
  }

  private validResponse(pack: EvidencePack): LLMResponse {
    const items = pack.items;
    const sentences: LLMResponse['sentences'] = [];

    // Build one sentence per evidence item (up to 4 items)
    for (let i = 0; i < Math.min(items.length, 4); i++) {
      const item = items[i]!;
      sentences.push({
        text: `${pack.studentToken} has demonstrated strong competency in ${item.criterionName ?? item.tag ?? 'learning areas'} this reporting period.`,
        evidence_ids: [item.id],
      });
    }

    // Ensure sentence count satisfies minimum for pack.length
    const minSentences = pack.length === 'long' ? 4 : pack.length === 'medium' ? 2 : 1;
    while (sentences.length < minSentences && items.length > 0) {
      const fallbackItem = items[sentences.length % items.length]!;
      sentences.push({
        text: `${pack.studentToken} has consistently shown meaningful engagement across classroom activities this semester.`,
        evidence_ids: [fallbackItem.id],
      });
    }

    return { sentences };
  }

  private invalidEvidenceIds(_pack: EvidencePack): LLMResponse {
    return {
      sentences: [
        {
          text: 'This student has demonstrated excellent understanding.',
          evidence_ids: ['00000000-0000-0000-0000-000000000000'], // fake ID
        },
      ],
    };
  }

  private deficitLanguageResponse(pack: EvidencePack): LLMResponse {
    const items = pack.items;
    return {
      sentences: [
        {
          text: `${pack.studentToken} is struggling and appears to be lazy in completing assignments.`,
          evidence_ids: items.length > 0 ? [items[0]!.id] : [],
        },
      ],
    };
  }

  private comparisonResponse(pack: EvidencePack): LLMResponse {
    const items = pack.items;
    return {
      sentences: [
        {
          text: `${pack.studentToken} performs better than other students in most areas.`,
          evidence_ids: items.length > 0 ? [items[0]!.id] : [],
        },
      ],
    };
  }

  private tooLongResponse(pack: EvidencePack): LLMResponse {
    const items = pack.items;
    const firstId = items.length > 0 ? items[0]!.id : 'fake';
    return {
      sentences: Array.from({ length: 15 }, (_, i) => ({
        text: `Sentence ${i + 1}: ${pack.studentToken} demonstrates ongoing progress in various areas.`,
        evidence_ids: [firstId],
      })),
    };
  }

  private noCitationsResponse(_pack: EvidencePack): LLMResponse {
    return {
      sentences: [
        {
          text: 'This student has worked hard all term.',
          evidence_ids: [],
        },
      ],
    };
  }
}
