export type DisplayNameValidationResult =
  | { ok: true; value: string }
  | { ok: false; reason: "empty" | "invalid" };

/**
 * Normalizes and validates a user display name.
 *
 * Rules (minimal, UX-focused):
 * - Must not be empty/whitespace.
 * - Must not be only quotes (e.g. "\"\"", "''").
 */
export const normalizeDisplayName = (raw: string): DisplayNameValidationResult => {
  const trimmed = raw.trim();
  if (!trimmed) return { ok: false, reason: "empty" };

  const withoutQuotes = trimmed.replace(/["']/g, "").trim();
  if (!withoutQuotes) return { ok: false, reason: "invalid" };

  return { ok: true, value: trimmed };
};
