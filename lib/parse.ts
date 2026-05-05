/**
 * Universal JSON extractor that works with any LLM (Kimi, Claude, GPT, etc.)
 * Handles markdown, extra text, malformed JSON, and encoding issues.
 */
export function universalJSONExtraction(rawOutput: string): Record<string, unknown> {
  if (!rawOutput || typeof rawOutput !== "string") {
    throw new Error("Invalid input: rawOutput must be a non-empty string");
  }

  let cleaned = rawOutput;

  // 1) Remove BOM and control characters (while preserving whitespace chars used in JSON)
  cleaned = cleaned
    .replace(/^\uFEFF/, "")
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, "")
    .trim();

  // 2) Model-specific cleanup (Kimi/open-model punctuation variants)
  cleaned = cleaned
    .replace(/[\u3000-\u303F]/g, " ")
    .replace(/[，]/g, ",")
    .replace(/[：]/g, ":")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'");

  // 3) Remove markdown code fences/backticks
  cleaned = cleaned
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/g, "")
    .replace(/`/g, "")
    .trim();

  // 4) Find likely JSON start
  const startCandidates = [
    '{"questions":',
    '{\n  "questions":',
    '{\n\t"questions":',
    '{ "questions":',
  ];

  let jsonStart = -1;
  for (const candidate of startCandidates) {
    const idx = cleaned.indexOf(candidate);
    if (idx !== -1) {
      jsonStart = idx;
      break;
    }
  }

  if (jsonStart === -1) {
    const questionMatch = cleaned.match(/\{[\s\S]{0,200}"questions"\s*:/);
    if (questionMatch?.index !== undefined) jsonStart = questionMatch.index;
  }

  if (jsonStart === -1) {
    const genericObjectStart = cleaned.indexOf("{");
    const genericArrayStart = cleaned.indexOf("[");
    if (genericObjectStart === -1) jsonStart = genericArrayStart;
    else if (genericArrayStart === -1) jsonStart = genericObjectStart;
    else jsonStart = Math.min(genericObjectStart, genericArrayStart);
  }

  if (jsonStart > 0) cleaned = cleaned.slice(jsonStart);

  // 5) Extract first balanced JSON block (supports nested braces/brackets, ignores quoted delimiters)
  const balanced = extractFirstBalancedJson(cleaned) ?? cleaned;

  // 6) Repair common JSON issues
  const repaired = repairJsonLikeString(balanced);

  // 7) Parse with fallbacks
  try {
    return normalizeToObject(JSON.parse(repaired));
  } catch (firstError) {
    // Fallback A: try with unquoted-key repair (dangerous inside strings — only as fallback)
    try {
      return normalizeToObject(JSON.parse(quoteUnquotedKeys(repaired)));
    } catch {
      // no-op; continue
    }

    // Fallback B: re-extract innermost balanced object and retry
    try {
      const extracted = repaired.match(/\{(?:[^{}]|\{(?:[^{}]|\{[^{}]*\})*\})*\}/);
      if (extracted?.[0]) return normalizeToObject(JSON.parse(repairJsonLikeString(extracted[0])));
    } catch {
      // no-op; continue
    }

    // Fallback C: sanitize bad escape sequences
    try {
      const sanitized = repaired
        .replace(/\\n/g, "\\\\n")
        .replace(/\\t/g, "\\\\t")
        .replace(/\\(?!["\\/bfnrt]|u[0-9a-fA-F]{4})/g, "");
      return normalizeToObject(JSON.parse(sanitized));
    } catch {
      const msg = firstError instanceof Error ? firstError.message : String(firstError);
      throw new Error(`Cannot parse JSON: ${msg}`);
    }
  }
}

/**
 * Maintained export name used across API routes.
 */
export function extractModelJson(raw: string): Record<string, unknown> {
  return universalJSONExtraction(raw);
}

/**
 * Validates question schema after parsing.
 * Supports both single-question object shape and { questions: [...] } shape.
 */
export function validateQuestionSchema(parsed: unknown): boolean {
  if (!parsed || typeof parsed !== "object") return false;
  const record = parsed as Record<string, unknown>;

  // Existing app shape (single question)
  const isSingleQuestionShape =
    typeof record.stem === "string" &&
    typeof record.optionA === "string" &&
    typeof record.optionB === "string" &&
    typeof record.optionC === "string" &&
    typeof record.optionD === "string" &&
    typeof record.correctAnswer === "string" &&
    typeof record.explanation === "string";

  if (isSingleQuestionShape) return true;

  const maybeQuestions =
    Array.isArray(record.questions)
      ? (record.questions as unknown[])
      : record.question && typeof record.question === "object"
        ? [record.question]
        : null;

  if (!maybeQuestions || maybeQuestions.length === 0) return false;

  for (const q of maybeQuestions) {
    if (!q || typeof q !== "object") return false;
    const item = q as Record<string, unknown>;
    if (typeof item.text !== "string") return false;
    if (!item.options || typeof item.options !== "object") return false;
    if (typeof item.correct !== "string") return false;
    if (typeof item.explanation !== "string") return false;

    const options = item.options as Record<string, unknown>;
    const validOptions = ["A", "B", "C", "D"].every(
      (letter) => typeof options[letter] === "string" && (options[letter] as string).length > 0,
    );

    if (!validOptions) return false;
  }

  return true;
}

function extractFirstBalancedJson(input: string): string | null {
  const objectStart = input.indexOf("{");
  const arrayStart = input.indexOf("[");

  if (objectStart === -1 && arrayStart === -1) return null;

  const start =
    objectStart === -1 ? arrayStart : arrayStart === -1 ? objectStart : Math.min(objectStart, arrayStart);
  const openChar = input[start];
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
    .replace(/\/{2}.*$/gm, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/,\s*([}\]])/g, "$1")
    .replace(/: undefined\b/g, ": null")
    .replace(/: NaN\b/g, ": null")
    .replace(/\r?\n/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Only applied as a last-resort fallback when the main parse fails and the JSON
// has genuinely unquoted keys. This regex is dangerous inside string values, so
// it must not run on every attempt — only after the standard parse has failed.
function quoteUnquotedKeys(input: string): string {
  return input.replace(/([\{,]\s*)([A-Za-z_][A-Za-z0-9_\-]*)(\s*:)/g, '$1"$2"$3');
}

function normalizeToObject(parsed: unknown): Record<string, unknown> {
  if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
    return parsed as Record<string, unknown>;
  }

  if (Array.isArray(parsed)) {
    return { questions: parsed as unknown[] };
  }

  throw new Error("Parsed JSON is not an object/array");
}
