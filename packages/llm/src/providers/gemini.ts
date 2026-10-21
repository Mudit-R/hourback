import type { LLMProvider } from '../index';
import type { EvidencePack, LLMResponse } from '@hourback/shared';
import { LLMResponseSchema } from '@hourback/shared';

const DEFAULT_MODEL = 'gemini-3.5-flash';

function buildPrompt(pack: EvidencePack, validatorFeedback?: string): string {
  const toneGuide: Record<string, string> = {
    warm: 'Write in a warm, encouraging, and personal tone suitable for parents.',
    formal: 'Write in a professional, formal tone suitable for official school reports.',
    encouraging: 'Write in an upbeat, growth-focused tone that celebrates effort and progress.',
  };

  const lengthGuide: Record<string, string> = {
    short: '1-3 sentences',
    medium: '2-5 sentences',
    long: '4-8 sentences',
  };

  const evidenceList = pack.items
    .map((item) => `- [${item.id}] (${item.type}): ${item.content}`)
    .join('\n');

  return `You are writing a progress report comment for a parent about a student referred to as ${pack.studentToken}.
Subject: ${pack.subject} | Grade: ${pack.grade} | Period: ${pack.periodName}
Tone: ${toneGuide[pack.tone] ?? toneGuide['warm']}
Length: ${lengthGuide[pack.length] ?? lengthGuide['medium']}

Evidence available (you MUST cite at least one evidence ID per sentence):
${evidenceList}

RULES (strictly enforced):
1. Every sentence MUST include at least one evidence_id from the list above.
2. Use ONLY evidence IDs that appear in the list.
3. Do NOT compare ${pack.studentToken} to other students.
4. Do NOT use deficit labels: lazy, weak, slow, struggling, behind, poor, bad, difficult, trouble, fail, cannot, unable, incapable, limited, lacks.
5. Write ONLY about ${pack.studentToken} — no other students.
6. Return ONLY valid JSON in this exact format:
{"sentences":[{"text":"...","evidence_ids":["uuid1","uuid2"]}]}

${validatorFeedback ? `\n--- VALIDATOR FEEDBACK ---\n${validatorFeedback}\n---\n` : ''}

Return JSON only. No markdown, no explanation.`;
}

export class GeminiProvider implements LLMProvider {
  readonly name = 'gemini';

  async generate(pack: EvidencePack, validatorFeedback?: string): Promise<LLMResponse> {
    const apiKey = process.env['GEMINI_API_KEY'];
    if (!apiKey) throw new Error('GEMINI_API_KEY env var not set');

    const model = process.env['GEMINI_MODEL'] ?? DEFAULT_MODEL;
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
    const prompt = buildPrompt(pack, validatorFeedback);

    const response = await fetch(`${apiUrl}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.4,
          topP: 0.9,
          maxOutputTokens: 1024,
          responseMimeType: 'application/json',
        },
        safetySettings: [
          { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
        ],
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Gemini API error ${response.status}: ${text}`);
    }

    const data = (await response.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };

    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

    // Strip markdown code fences if present
    const cleaned = rawText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();

    let parsed: unknown;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      throw new Error(`Gemini returned non-JSON: ${cleaned.slice(0, 200)}`);
    }

    return LLMResponseSchema.parse(parsed);
  }
}
