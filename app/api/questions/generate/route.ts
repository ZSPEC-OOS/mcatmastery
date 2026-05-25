import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db, ensureSchema, getSetting } from "../../../../lib/db";
import { callModel, getModelForRole } from "../../../../lib/model";
import { GENERATION_SYSTEM_PROMPT, VALIDATION_SYSTEM_PROMPT } from "../../../../lib/anthropic";
import { extractModelJson } from "../../../../lib/parse";

const GenerateSchema = z.object({
  section: z.enum(["Chem/Phys", "CARS", "Bio/Biochem", "Psych/Soc"]),
  topic:   z.string().optional(),
  count:   z.number().min(1).max(10).default(5),
});

function jaccardSimilarity(a: string, b: string): number {
  const setA = new Set(a.toLowerCase().split(/\s+/));
  const setB = new Set(b.toLowerCase().split(/\s+/));
  const intersection = [...setA].filter((w) => setB.has(w)).length;
  const union = new Set([...setA, ...setB]).size;
  return union === 0 ? 0 : intersection / union;
}

export async function POST(req: NextRequest) {
  try {
    const body = GenerateSchema.parse(await req.json());

    await ensureSchema();

    const [genPrompt, valPrompt, activeModel, existing] = await Promise.all([
      getSetting("generation_prompt").then((v) => v ?? GENERATION_SYSTEM_PROMPT),
      getSetting("validation_prompt").then((v) => v ?? VALIDATION_SYSTEM_PROMPT),
      getModelForRole("generation"),
      db.question.findMany({
        where:   { section: body.section },
        select:  { stem: true },
        take:    50,
        orderBy: { createdAt: "desc" },
      }),
    ]);

    const modelOpts = {
      modelId:                    activeModel?.modelId,
      baseUrl:                    activeModel?.baseUrl                    || undefined,
      apiKey:                     activeModel?.apiKey                     || undefined,
      modelMaxTokens:             activeModel?.maxTokens                  || undefined,
      modelMaxReasoningTokens:    activeModel?.maxReasoningTokens         || undefined,
    };

    const generated: { stem: string }[] = [];

    for (let i = 0; i < body.count; i++) {
      try {
        const raw = await callModel({
          ...modelOpts,
          system:      genPrompt,
          userContent: `Generate one ${body.section} question${body.topic ? ` about ${body.topic}` : ""}.`,
          maxTokens:   32000,
        });

        let parsed: Record<string, unknown>;
        try {
          parsed = extractModelJson(raw);
        } catch { continue; }

        const allStems = [...existing.map((q: { stem: string }) => q.stem), ...generated.map((q) => q.stem)];
        if (allStems.some((stem) => jaccardSimilarity(stem, parsed.stem as string) > 0.75)) continue;

        const valRaw = await callModel({
          ...modelOpts,
          system:      valPrompt,
          userContent: JSON.stringify(parsed),
          maxTokens:   16000,
        });

        let validation: { pass: boolean; corrected_question: Record<string, unknown> | null };
        try {
          validation = extractModelJson(valRaw) as typeof validation;
        } catch { continue; }

        if (!validation.pass && !validation.corrected_question) continue;

        const final = validation.pass ? parsed : (validation.corrected_question ?? parsed);

        await db.question.create({
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
            difficulty:    (final.difficulty as string) ?? "medium",
          },
        });

        generated.push({ stem: final.stem as string });
      } catch { continue; }
    }

    return NextResponse.json({ generated: generated.length });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.issues }, { status: 400 });
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
