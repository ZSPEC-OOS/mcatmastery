/**
 * Extracts and parses a JSON object from a model response.
 * Handles markdown code fences, leading/trailing prose, and attempts
 * progressive fallbacks before throwing.
 */
export function extractModelJson(raw: string): Record<string, unknown> {
  const cleaned = normalizeModelOutput(raw);

  // 1. Strip markdown code fences (```json ... ``` or ``` ... ```)
  const stripped = cleaned
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();

  // 2. Try parsing the stripped content directly
  const direct = safeParseJson(stripped);
  if (direct) return direct;

  // 3. Parse the first balanced JSON object/array from the text.
  const firstBalanced = extractFirstBalancedJson(stripped);
  if (firstBalanced) {
    const parsedBalanced = safeParseJson(firstBalanced);
    if (parsedBalanced) return parsedBalanced;

    const repairedBalanced = repairJsonLikeString(firstBalanced);
    const repairedParsedBalanced = safeParseJson(repairedBalanced);
    if (repairedParsedBalanced) return repairedParsedBalanced;
  }

  // 4. Fallback: Extract a broad {...} block (legacy behavior)
  const match = stripped.match(/\{[\s\S]*\}/);
  if (match) {
    const parsedMatch = safeParseJson(match[0]);
    if (parsedMatch) return parsedMatch;

    const repairedMatch = repairJsonLikeString(match[0]);
    const repairedParsedMatch = safeParseJson(repairedMatch);
    if (repairedParsedMatch) return repairedParsedMatch;
  }

  // 5. Last attempt: repair the whole response and parse.
  const repaired = repairJsonLikeString(stripped);
  const repairedParsed = safeParseJson(repaired);
  if (repairedParsed) return repairedParsed;

  // 6. Nothing worked — propagate a clear error
  throw new SyntaxError("No JSON object found in model response");
}

function normalizeModelOutput(raw: string): string {
  return raw
    .replace(/^\s*json\s*[:\n]/i, "")
    .replace(/\u201c|\u201d/g, '"')
    .replace(/\u2018|\u2019/g, "'")
    .replace(/\r\n/g, "\n")
    .trim();
}

function safeParseJson(input: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(input) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }

    if (Array.isArray(parsed)) {
      const firstObject = parsed.find((v) => v && typeof v === "object" && !Array.isArray(v));
      if (firstObject) return firstObject as Record<string, unknown>;
    }

    return null;
  } catch {
    return null;
  }
}

function extractFirstBalancedJson(input: string): string | null {
  const objectStart = input.indexOf("{");
  const arrayStart = input.indexOf("[");
  let start = -1;
  let openChar = "";

  if (objectStart === -1 && arrayStart === -1) return null;
  if (objectStart === -1 || (arrayStart !== -1 && arrayStart < objectStart)) {
    start = arrayStart;
    openChar = "[";
  } else {
    start = objectStart;
    openChar = "{";
  }

  const closeChar = openChar === "{" ? "}" : "]";

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < input.length; i++) {
    const ch = input[i];

    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }

    if (ch === '"') {
      inString = true;
      continue;
    }

    if (ch === openChar) depth++;
    if (ch === closeChar) {
      depth--;
      if (depth === 0) return input.slice(start, i + 1);
      if (depth < 0) return null;
    }
  }

  return null;
}

function repairJsonLikeString(input: string): string {
  return input
    // Remove JS comments sometimes emitted by smaller/open models
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|\s+)\/\/.*$/gm, "")
    // Quote bare keys: { foo: 1 } -> { "foo": 1 }
    .replace(/([{,]\s*)([A-Za-z_][A-Za-z0-9_\-]*)(\s*:)/g, '$1"$2"$3')
    // Replace single-quoted strings with JSON-compatible double quotes
    .replace(/'([^'\\]*(?:\\.[^'\\]*)*)'/g, (_, inner: string) => `"${inner.replace(/"/g, '\\"')}"`)
    // Remove trailing commas in arrays/objects
    .replace(/,\s*([}\]])/g, "$1")
    .trim();
}
