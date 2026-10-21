import { tokenizeName, rehydrateName, STUDENT_TOKEN } from '../tokenizer';

describe('PII Tokenizer & Name Re-hydrator', () => {
  it('tokenizes full name and preferred name from text', () => {
    const rawText = 'Aarav Sharma demonstrated focus today. Aarav was enthusiastic in math.';
    const tokenized = tokenizeName(rawText, 'Aarav Sharma', 'Aarav');

    expect(tokenized).not.toContain('Aarav Sharma');
    expect(tokenized).not.toContain('Aarav');
    expect(tokenized).toContain(STUDENT_TOKEN);
    expect(tokenized).toBe(
      `${STUDENT_TOKEN} demonstrated focus today. ${STUDENT_TOKEN} was enthusiastic in math.`,
    );
  });

  it('rehydrates token with preferred name if available', () => {
    const generatedText = `${STUDENT_TOKEN} has demonstrated excellent problem-solving ability.`;
    const rehydrated = rehydrateName(generatedText, 'Priya', 'Priyadarshini Nair');

    expect(rehydrated).toBe('Priya has demonstrated excellent problem-solving ability.');
  });

  it('rehydrates token with real name if preferred name is null', () => {
    const generatedText = `${STUDENT_TOKEN} has made steady progress.`;
    const rehydrated = rehydrateName(generatedText, null, 'Rohan Mehta');

    expect(rehydrated).toBe('Rohan has made steady progress.');
  });
});
