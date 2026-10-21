/**
 * Replaces a student's real name with an opaque token before the evidence pack
 * leaves the worker process boundary to the LLM provider.
 *
 * Re-hydration maps the token back to the real name after LLM validation,
 * inside the same process, before any DB write.
 *
 * Design: The token is always "STUDENT_1" (fixed, not random) so that:
 * - The LLM always uses "STUDENT_1" in generated text
 * - Validator checks are deterministic
 * - Re-hydration is a simple string replace
 */
export const STUDENT_TOKEN = 'STUDENT_1';

/**
 * Replaces all occurrences of `realName` and `preferredName` in `text`
 * with STUDENT_TOKEN.
 */
export function tokenizeName(text: string, realName: string, preferredName?: string | null): string {
  let result = text;
  // Replace full name first (longer match wins)
  result = result.replace(new RegExp(escapeRegex(realName), 'gi'), STUDENT_TOKEN);
  if (preferredName && preferredName !== realName) {
    result = result.replace(new RegExp(escapeRegex(preferredName), 'gi'), STUDENT_TOKEN);
  }
  return result;
}

/**
 * Replaces STUDENT_TOKEN with the real preferred name (or full name as fallback).
 */
export function rehydrateName(text: string, preferredName: string | null, realName: string): string {
  const displayName = preferredName ?? realName.split(' ')[0] ?? realName;
  return text.replace(new RegExp(escapeRegex(STUDENT_TOKEN), 'g'), displayName);
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
