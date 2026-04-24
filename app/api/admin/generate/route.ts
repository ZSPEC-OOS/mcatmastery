import { NextRequest } from "next/server";
import { z } from "zod";
import { requireUser } from "../../../../lib/auth";
import { db } from "../../../../lib/db";
import { anthropic, GENERATION_SYSTEM_PROMPT, VALIDATION_SYSTEM_PROMPT } from "../../../../lib/anthropic";
import { syncQuestionToFirestore, getModelByModelId } from "../../../../lib/firestore";

const AdminGenerateSchema = z.object({
  section:        z.enum(["Chem/Phys", "CARS", "Bio/Biochem", "Psych/Soc"]),
  topic:          z.string().optional(),
  count:          z.number().min(1).max(50).default(5),
  model:          z.string().default("claude-opus-4-7"),
  difficulty:     z.enum(["easy", "medium", "hard", "mixed"]).default("mixed"),
  dedupThreshold: z.number().min(0.3).max(0.99).default(0.75),
});

const DIFFICULTIES = ["easy", "medium", "hard"] as const;

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

async function callModel(opts: {
  modelId: string;
  baseUrl?: string;
  apiKey?: string;
  system: string;
  userContent: string;
  maxTokens: number;
}): Promise<string> {
  if (opts.baseUrl) {
    const url = `${opts.baseUrl.replace(/\/+$/, "")}/chat/completions`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(opts.apiKey ? { Authorization: `Bearer ${opts.apiKey}` } : {}),
      },
      body: JSON.stringify({
        model: opts.modelId,
        messages: [
          { role: "system", content: opts.system },
          { role: "user", content: opts.userContent },
        ],
        max_tokens: opts.maxTokens,
      }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => res.statusText);
      throw new Error(`Model API error ${res.status}: ${text.slice(0, 200)}`);
    }
    const data = await res.json() as { choices: Array<{ message: { content: string } }> };
    return data.choices?.[0]?.message?.content ?? "";
  }

  // Anthropic SDK path
  const msg = await anthropic.messages.create({
    model:      opts.modelId,
    max_tokens: opts.maxTokens,
    system:     opts.system,
    messages:   [{ role: "user", content: opts.userContent }],
  });
  return msg.content[0].type === "text" ? msg.content[0].text : "";
}

export async function POST(req: NextRequest) {
  try {
    if (process.env.CLERK_SECRET_KEY) await requireUser();

    const body = AdminGenerateSchema.parse(await req.json());

    // Load custom prompts from DB if set
    const [customGen, customVal] = await Promise.all([
      db.appSetting.findUnique({ where: { key: "generation_prompt" } }),
      db.appSetting.findUnique({ where: { key: "validation_prompt" } }),
    ]);
    const genPrompt = customGen?.value || GENERATION_SYSTEM_PROMPT;
    const valPrompt = customVal?.value || VALIDATION_SYSTEM_PROMPT;

    // Look up custom model config (base URL + API key) from Firebase
    const modelConfig = await getModelByModelId(body.model).catch(() => null);

    const existing = await db.question.findMany({
      where:  { section: body.section },
      select: { stem: true },
    });

    const encoder  = new TextEncoder();
    const generated: string[] = [];

    const stream = new ReadableStream({
      async start(controller) {
        const enqueue = (data: unknown) =>
          controller.enqueue(encoder.encode(sseChunk(data)));

        for (let i = 0; i < body.count; i++) {
          enqueue({ type: "progress", current: i + 1, total: body.count });

          try {
            const targetDifficulty =
              body.difficulty === "mixed"
                ? DIFFICULTIES[Math.floor(Math.random() * 3)]
                : body.difficulty;

            const userMsg = [
              `Generate one ${body.section} question`,
              body.topic ? `about ${body.topic}` : "",
              `at ${targetDifficulty} difficulty.`,
            ]
              .filter(Boolean)
              .join(" ");

            const raw = await callModel({
              modelId:    body.model,
              baseUrl:    modelConfig?.baseUrl,
              apiKey:     modelConfig?.apiKey,
              system:     genPrompt,
              userContent: userMsg,
              maxTokens:  1024,
            });

            let parsed: Record<string, unknown>;
            try {
              const jsonMatch = raw.match(/\{[\s\S]*\}/);
              parsed = JSON.parse(jsonMatch ? jsonMatch[0] : raw);
            } catch {
              enqueue({ type: "skip", reason: "parse_error", index: i });
              continue;
            }

            const allStems = [
              ...existing.map((q: { stem: string }) => q.stem),
              ...generated,
            ];
            const isDup = allStems.some(
              (stem) =>
                jaccardSimilarity(stem, parsed.stem as string) > body.dedupThreshold
            );
            if (isDup) {
              enqueue({ type: "skip", reason: "duplicate", index: i });
              continue;
            }

            const valRaw = await callModel({
              modelId:    body.model,
              baseUrl:    modelConfig?.baseUrl,
              apiKey:     modelConfig?.apiKey,
              system:     valPrompt,
              userContent: JSON.stringify(parsed),
              maxTokens:  512,
            });

            let validation: {
              pass: boolean;
              flags: string[];
              corrected_question: Record<string, unknown> | null;
            };
            try {
              const jsonMatch = valRaw.match(/\{[\s\S]*\}/);
              validation = JSON.parse(jsonMatch ? jsonMatch[0] : valRaw);
            } catch {
              enqueue({ type: "skip", reason: "validation_parse_error", index: i });
              continue;
            }

            if (!validation.pass && !validation.corrected_question) {
              enqueue({
                type:  "skip",
                reason: "validation_failed",
                flags: validation.flags,
                index: i,
              });
              continue;
            }

            const final = validation.pass
              ? parsed
              : (validation.corrected_question ?? parsed);

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
                difficulty:    (final.difficulty as string) ?? targetDifficulty,
              },
            });

            generated.push(final.stem as string);
            enqueue({ type: "question", question: saved });
            syncQuestionToFirestore(saved as unknown as Record<string, unknown>).catch(() => {});
          } catch (err) {
            enqueue({
              type:    "skip",
              reason:  "error",
              message: err instanceof Error ? err.message : "unknown",
              index:   i,
            });
          }
        }

        enqueue({ type: "done", generated: generated.length });
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type":  "text/event-stream",
        "Cache-Control": "no-cache",
        Connection:      "keep-alive",
      },
    });
  } catch (err) {
    if (err instanceof z.ZodError)
      return new Response(JSON.stringify({ error: err.issues }), { status: 400 });
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }
}
