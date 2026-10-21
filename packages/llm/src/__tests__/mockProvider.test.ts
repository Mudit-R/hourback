import { MockProvider } from '../providers/mock';
import type { EvidencePack } from '@hourback/shared';

const samplePack: EvidencePack = {
  studentToken: 'STUDENT_1',
  tone: 'warm',
  length: 'medium',
  periodName: 'Semester 1',
  subject: 'Mathematics',
  grade: 'Grade 5',
  items: [
    {
      id: 'a0000000-0000-0000-0000-000000000001',
      type: 'assessment_result',
      content: 'Mastered fraction addition with uncommon denominators',
      criterionName: 'Conceptual Understanding',
      level: 6,
      maxLevel: 8,
    },
    {
      id: 'a0000000-0000-0000-0000-000000000002',
      type: 'observation',
      content: 'Helped peer break down multi-step word problem during inquiry group work',
      tag: 'collaboration',
    },
  ],
};

describe('MockProvider', () => {
  it('generates valid grounded response in default mode', async () => {
    const provider = new MockProvider('valid');
    const response = await provider.generate(samplePack);

    expect(response.sentences.length).toBeGreaterThan(0);
    expect(response.sentences[0]!.evidence_ids).toContain('a0000000-0000-0000-0000-000000000001');
    expect(response.sentences[0]!.text).toContain('STUDENT_1');
  });

  it('generates deficit language in adversarial mode deficit_language', async () => {
    const provider = new MockProvider('deficit_language');
    const response = await provider.generate(samplePack);

    expect(response.sentences[0]!.text.toLowerCase()).toMatch(/lazy|struggling/);
  });

  it('generates peer comparisons in adversarial mode comparison', async () => {
    const provider = new MockProvider('comparison');
    const response = await provider.generate(samplePack);

    expect(response.sentences[0]!.text).toContain('better than other students');
  });

  it('generates invalid evidence IDs in adversarial mode invalid_evidence', async () => {
    const provider = new MockProvider('invalid_evidence');
    const response = await provider.generate(samplePack);

    expect(response.sentences[0]!.evidence_ids).toEqual(['00000000-0000-0000-0000-000000000000']);
  });

  it('generates sentence without citations in mode no_citations', async () => {
    const provider = new MockProvider('no_citations');
    const response = await provider.generate(samplePack);

    expect(response.sentences[0]!.evidence_ids).toEqual([]);
  });
});
