import { NextRequest } from "next/server";
import { z } from "zod";
import { ensureSchema, getSetting } from "../../../../../lib/db";
import { callModel, getActiveModel } from "../../../../../lib/model";
import { GENERATION_SYSTEM_PROMPT, VALIDATION_SYSTEM_PROMPT } from "../../../../../lib/anthropic";
import { saveQuestion, getQuestions } from "../../../../../lib/firestore";
import { getSubTypeById } from "../../../../../lib/subtypes";
import { extractModelJson } from "../../../../../lib/parse";

const GenerateSchema = z.object({
  section: z.enum(["Chem/Phys", "CARS", "Bio/Biochem", "Psych/Soc"]),
  subType: z.string().optional(),
  count:   z.number().min(1).max(50).default(5),
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
      getQuestions({ section: body.section }),
    ]);

    const modelOpts = {
      modelId: activeModel?.modelId,
      baseUrl:  activeModel?.baseUrl  || undefined,
      apiKey:   activeModel?.apiKey   || undefined,
    };

    const subTypeDef = body.subType ? getSubTypeById(body.subType) : undefined;

    const encoder   = new TextEncoder();
    const generated: string[] = [];

    const stream = new ReadableStream({
      async start(controller) {
        const enqueue = (data: unknown) => {
          try { controller.enqueue(encoder.encode(sseChunk(data))); } catch { /* client disconnected */ }
        };

        for (let i = 0; i < body.count; i++) {
          enqueue({ type: "progress", current: i + 1, total: body.count });

          try {
            const subTypeClause = subTypeDef
              ? ` Subtype: "${subTypeDef.label}" — ${subTypeDef.description}`
              : "";

            const raw = await callModel({
              ...modelOpts,
              system:      genPrompt,
              userContent: `Generate one ${body.section} question.${subTypeClause}`,
              maxTokens:   1200,
            });

            let parsed: Record<string, unknown>;
            try {
              parsed = extractModelJson(raw);
            } catch (parseErr) {
              enqueue({
                type: "skip",
                reason: "parse_error",
                message: `${parseErr instanceof Error ? parseErr.message : String(parseErr)} | raw: ${raw.slice(0, 300)}`,
                index: i,
              });
              continue;
            }

            const allStems = [...existing.map((q) => q.stem), ...generated];
            if (allStems.some((stem) => jaccardSimilarity(stem, parsed.stem as string) > 0.75)) {
              enqueue({ type: "skip", reason: "duplicate", index: i });
              continue;
            }

            const valRaw = await callModel({
              ...modelOpts,
              system:      valPrompt,
              userContent: JSON.stringify({
                question: parsed,
                requestedSubType: subTypeDef?.label ?? "general",
              }),
              maxTokens:   512,
            });

            let validation: { pass: boolean; flags?: string[]; corrected_question: Record<string, unknown> | null };
            try {
              validation = extractModelJson(valRaw) as typeof validation;
            } catch (parseErr) {
              enqueue({
                type: "skip",
                reason: "validation_parse_error",
                message: `${parseErr instanceof Error ? parseErr.message : String(parseErr)} | raw: ${valRaw.slice(0, 200)}`,
                index: i,
              });
              continue;
            }

            if (!validation.pass && !validation.corrected_question) {
              enqueue({ type: "skip", reason: "validation_failed", index: i });
              continue;
            }

            const final = validation.pass ? parsed : (validation.corrected_question ?? parsed);

            const saved = await saveQuestion({
              section:       final.section as string,
              topic:         final.topic as string,
              subType:       body.subType,
              passage:       (final.passage as string) ?? null,
              stem:          final.stem as string,
              optionA:       final.optionA as string,
              optionB:       final.optionB as string,
              optionC:       final.optionC as string,
              optionD:       final.optionD as string,
              correctAnswer: final.correctAnswer as string,
              explanation:   final.explanation as string,
              difficulty:    (final.difficulty as string) ?? "medium",
              aiGenerated:   true,
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
