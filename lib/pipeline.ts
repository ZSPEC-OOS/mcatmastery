import { db } from "./db";
import { anthropic, VALIDATION_SYSTEM_PROMPT } from "./anthropic";
import { syncQuestionToFirestore } from "./firestore";

const STOPWORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "by", "for", "from", "if", "in", "into", "is", "it",
  "of", "on", "or", "that", "the", "their", "then", "there", "these", "this", "to", "was", "were", "with",
]);

function normalizeText(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenSet(input: string): Set<string> {
  return new Set(
    normalizeText(input)
      .split(" ")
      .filter((token) => token.length > 1 && !STOPWORDS.has(token)),
  );
}

function charNgrams(input: string, size = 3): Set<string> {
  const compact = normalizeText(input).replace(/\s+/g, " ");
  if (compact.length < size) return new Set([compact]);
  const grams = new Set<string>();
  for (let i = 0; i <= compact.length - size; i++) {
    grams.add(compact.slice(i, i + size));
  }
  return grams;
}

function setJaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 0;
  let intersection = 0;
  for (const token of a) {
    if (b.has(token)) intersection++;
  }
  const union = new Set([...a, ...b]).size;
  return union === 0 ? 0 : intersection / union;
}

export function jaccardSimilarity(a: string, b: string): number {
  return setJaccard(tokenSet(a), tokenSet(b));
}

export function stemSimilarity(a: string, b: string): number {
  const normalizedA = normalizeText(a);
  const normalizedB = normalizeText(b);
  if (!normalizedA || !normalizedB) return 0;
  if (normalizedA === normalizedB) return 1;

  const tokenSim = setJaccard(tokenSet(a), tokenSet(b));
  const gramSim = setJaccard(charNgrams(a), charNgrams(b));
  const containment = normalizedA.includes(normalizedB) || normalizedB.includes(normalizedA) ? 1 : 0;

  return Math.max(tokenSim, gramSim * 0.9, containment * 0.95);
}

export function isDuplicateStem(candidate: string, stems: string[], threshold: number): boolean {
  return stems.some((stem) => stemSimilarity(stem, candidate) >= threshold);
}

export function sseChunk(data: unknown): string {
  return `data: ${JSON.stringify(data)}\n\n`;
}

export async function verifyAndSave(
  parsed: Record<string, unknown>,
  opts: {
    model: string;
    dedupThreshold: number;
    existingStems: string[];
    sessionStems: string[];
    valPrompt?: string;
    targetDifficulty?: string;
  },
): Promise<{ saved: Record<string, unknown> | null; reason?: string; flags?: string[] }> {
  const valPrompt = opts.valPrompt ?? VALIDATION_SYSTEM_PROMPT;
  const candidateStem = ((parsed.stem as string) ?? "").trim();
  if (!candidateStem) return { saved: null, reason: "missing_stem" };

  const allStems = [...opts.existingStems, ...opts.sessionStems];
  const isDup = isDuplicateStem(candidateStem, allStems, opts.dedupThreshold);
  if (isDup) return { saved: null, reason: "duplicate" };

  let validation: { pass: boolean; flags: string[]; corrected_question: Record<string, unknown> | null };
  try {
    const valMsg = await anthropic.messages.create({
      model: opts.model,
      max_tokens: 512,
      system: valPrompt,
      messages: [{ role: "user", content: JSON.stringify(parsed) }],
    });
    const valRaw = valMsg.content[0].type === "text" ? valMsg.content[0].text : "{}";
    const jsonMatch = valRaw.match(/\{[\s\S]*\}/);
    validation = JSON.parse(jsonMatch ? jsonMatch[0] : valRaw);
  } catch {
    return { saved: null, reason: "validation_parse_error" };
  }

  if (!validation.pass && !validation.corrected_question) {
    return { saved: null, reason: "validation_failed", flags: validation.flags };
  }

  const final = validation.pass ? parsed : (validation.corrected_question ?? parsed);

  const saved = await db.question.create({
    data: {
      section:       final.section as string,
      topic:         final.topic as string,
      passage:       (final.passage as string) ?? null,
      stem:          final.stem as string,
      optionA:       final.optionA as string,
      optionB:       final.optionB as string,
      optionC:       final.optionC as string,
      optionD:       final.optionD as string,
      correctAnswer: final.correctAnswer as string,
      explanation:   final.explanation as string,
      difficulty:    (final.difficulty as string) ?? opts.targetDifficulty ?? "medium",
    },
  });

  syncQuestionToFirestore(saved as unknown as Record<string, unknown>).catch(() => {});
  return { saved: saved as unknown as Record<string, unknown> };
}
