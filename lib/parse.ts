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

  // 3. Parse the first balanced JSON object from the text.
  const firstBalanced = extractFirstBalancedObject(stripped);
  if (firstBalanced) {
    try { return JSON.parse(firstBalanced) as Record<string, unknown>; } catch { /* fall through */ }
  }

  // 4. Fallback: Extract a broad {...} block (legacy behavior)
  const match = stripped.match(/\{[\s\S]*\}/);
  if (match) {
    try { return JSON.parse(match[0]) as Record<string, unknown>; } catch { /* fall through */ }
  }

  // 5. Nothing worked — propagate a clear error
  throw new SyntaxError("No JSON object found in model response");
}

function extractFirstBalancedObject(input: string): string | null {
  const start = input.indexOf("{");
  if (start === -1) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < input.length; i++) {
    const ch = input[i];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (ch === "\\") {
        escaped = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }

    if (ch === '"') {
      inString = true;
      continue;
    }

    if (ch === "{") depth++;
    if (ch === "}") {
      depth--;
      if (depth === 0) return input.slice(start, i + 1);
      if (depth < 0) return null;
    }
  }

  return null;
}
