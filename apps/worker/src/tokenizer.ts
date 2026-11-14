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
export function tokenizeName(
  text: string,
  realName: string,
  preferredName?: string | null,
  replacement = STUDENT_TOKEN,
): string {
  let result = text;
  // Replace full name first (longer match wins)
  result = replaceWholeName(result, realName, replacement);
  if (preferredName && preferredName !== realName) {
    result = replaceWholeName(result, preferredName, replacement);
  }
  return result;
}

export interface StudentNameRecord {
  name: string;
  preferred_name: string | null;
}

/** Remove student names throughout all evidence, plus obvious contact details. */
export function sanitizeStudentEvidence(
  text: string,
  subjectName: string,
  subjectPreferredName: string | null,
  classmates: StudentNameRecord[],
): string {
  let result = text;
  const subjectNames = new Set([subjectName, subjectPreferredName].filter(Boolean));
  for (const student of classmates) {
    const isSubject = subjectNames.has(student.name) ||
      (student.preferred_name !== null && subjectNames.has(student.preferred_name));
    if (!isSubject) {
      result = tokenizeName(result, student.name, student.preferred_name, '[CLASSMATE]');
    }
  }
  result = tokenizeName(result, subjectName, subjectPreferredName);
  result = result
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[EMAIL REDACTED]')
    .replace(/(?<![\p{L}\p{N}])\+?\d[\d\s().-]{7,}\d(?![\p{L}\p{N}])/gu, '[PHONE REDACTED]');
  return result;
}

function replaceWholeName(text: string, name: string, replacement: string): string {
  if (!name.trim()) return text;
  const boundaryPattern = `(?<![\\p{L}\\p{N}])${escapeRegex(name)}(?![\\p{L}\\p{N}])`;
  return text.replace(new RegExp(boundaryPattern, 'giu'), replacement);
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
