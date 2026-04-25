/**
 * Extracts and parses a JSON object from a model response.
 * Handles markdown code fences, leading/trailing prose, and attempts
 * progressive fallbacks before throwing.
 */
export function extractModelJson(raw: string): Record<string, unknown> {
  // 1. Strip markdown code fences (```json ... ``` or ``` ... ```)
  const stripped = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();

  // 2. Try parsing the stripped content directly
  try { return JSON.parse(stripped) as Record<string, unknown>; } catch { /* fall through */ }

  // 3. Extract the outermost {...} block (handles prose before/after JSON)
  const match = stripped.match(/\{[\s\S]*\}/);
  if (match) return JSON.parse(match[0]) as Record<string, unknown>;

  // 4. Nothing worked — propagate a clear error
  throw new SyntaxError("No JSON object found in model response");
}
