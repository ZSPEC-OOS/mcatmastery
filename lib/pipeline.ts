import { db } from "./db";
import { anthropic, VALIDATION_SYSTEM_PROMPT } from "./anthropic";
import { syncQuestionToFirestore } from "./firestore";

export function jaccardSimilarity(a: string, b: string): number {
  const setA = new Set(a.toLowerCase().split(/\s+/));
  const setB = new Set(b.toLowerCase().split(/\s+/));
  const intersection = [...setA].filter((w) => setB.has(w)).length;
  const union = new Set([...setA, ...setB]).size;
  return union === 0 ? 0 : intersection / union;
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

  const allStems = [...opts.existingStems, ...opts.sessionStems];
  const isDup = allStems.some(
    (stem) => jaccardSimilarity(stem, (parsed.stem as string) ?? "") > opts.dedupThreshold,
  );
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
