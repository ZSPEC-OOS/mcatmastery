import { NextRequest } from "next/server";
import { z } from "zod";
import { db, ensureSchema } from "../../../../../lib/db";
import { callModel, getActiveModel } from "../../../../../lib/model";
import { GENERATION_SYSTEM_PROMPT, VALIDATION_SYSTEM_PROMPT } from "../../../../../lib/anthropic";
import { getSetting } from "../../../../../lib/db";

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

function sseChunk(data: unknown): string {
  return `data: ${JSON.stringify(data)}\n\n`;
}

export async function POST(req: NextRequest) {
  try {
    const body = GenerateSchema.parse(await req.json());

    await ensureSchema();

    const [genPrompt, valPrompt, activeModel, existing] = await Promise.all([
      getSetting("generation_prompt").then((v) => v ?? GENERATION_SYSTEM_PROMPT),
      getSetting("validation_prompt").then((v) => v ?? VALIDATION_SYSTEM_PROMPT),
      getActiveModel(),
      db.question.findMany({
        where:   { section: body.section },
        select:  { stem: true },
        take:    50,
        orderBy: { createdAt: "desc" },
      }),
    ]);

    const modelOpts = {
      modelId: activeModel?.modelId,
      baseUrl:  activeModel?.baseUrl  || undefined,
      apiKey:   activeModel?.apiKey   || undefined,
    };

    const encoder  = new TextEncoder();
    const generated: string[] = [];

    const stream = new ReadableStream({
      async start(controller) {
        const enqueue = (data: unknown) =>
          controller.enqueue(encoder.encode(sseChunk(data)));

        for (let i = 0; i < body.count; i++) {
          enqueue({ type: "progress", current: i + 1, total: body.count });

          try {
            const raw = await callModel({
              ...modelOpts,
              system:      genPrompt,
              userContent: `Generate one ${body.section} question${body.topic ? ` about ${body.topic}` : ""}.`,
              maxTokens:   1200,
            });

            let parsed: Record<string, unknown>;
            try {
              const jsonMatch = raw.match(/\{[\s\S]*\}/);
              parsed = JSON.parse(jsonMatch ? jsonMatch[0] : raw);
            } catch {
              enqueue({ type: "skip", reason: "parse_error", index: i });
              continue;
            }

            const allStems = [...existing.map((q: { stem: string }) => q.stem), ...generated];
            if (allStems.some((stem) => jaccardSimilarity(stem, parsed.stem as string) > 0.75)) {
              enqueue({ type: "skip", reason: "duplicate", index: i });
              continue;
            }

            const valRaw = await callModel({
              ...modelOpts,
              system:      valPrompt,
              userContent: JSON.stringify(parsed),
              maxTokens:   512,
            });

            let validation: { pass: boolean; corrected_question: Record<string, unknown> | null };
            try {
              const jsonMatch = valRaw.match(/\{[\s\S]*\}/);
              validation = JSON.parse(jsonMatch ? jsonMatch[0] : valRaw);
            } catch {
              continue;
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
                difficulty:    (final.difficulty as string) ?? "medium",
              },
            });

            generated.push(final.stem as string);
            enqueue({ type: "question", question: saved });
          } catch (err) {
            enqueue({ type: "skip", reason: "error", message: err instanceof Error ? err.message : "unknown", index: i });
          }
        }

        enqueue({ type: "done", generated: generated.length });
        controller.close();
      },
    });

    return new Response(stream, {
      headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" },
    });
  } catch (err) {
    if (err instanceof z.ZodError)
      return new Response(JSON.stringify({ error: err.issues }), { status: 400 });
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: msg }), { status: 500 });
  }
}
