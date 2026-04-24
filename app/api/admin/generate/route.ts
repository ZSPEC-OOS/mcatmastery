import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "../../../../lib/db";
import { anthropic, GENERATION_SYSTEM_PROMPT, VALIDATION_SYSTEM_PROMPT } from "../../../../lib/anthropic";
import { syncQuestionToFirestore, getModelByModelId, uploadQuestionImage } from "../../../../lib/firestore";

// ── Prompts ──────────────────────────────────────────────────────────────────

const IMAGE_GENERATION_PROMPT = `You are an expert MCAT question writer who creates questions that require visual interpretation of scientific data.

Generate a high-quality, MCAT-style multiple-choice question where a figure (graph, diagram, table, or experimental setup) is ESSENTIAL to answering correctly. Students must interpret the visual to answer.

Requirements:
- The stem MUST reference the figure explicitly (e.g. "Based on the graph in Figure 1...", "According to the experimental setup shown...", "What does the data indicate about...")
- Include a 2–4 sentence passage describing the experimental context that produced the figure
- Write four plausible answer choices (A–D) with exactly one correct answer
- Provide a detailed explanation referencing what the figure shows and why each distractor is wrong
- The figure_prompt must describe a scientifically accurate figure suitable for AI image generation

Output ONLY valid JSON in this exact shape:
{
  "section": "Chem/Phys" | "CARS" | "Bio/Biochem" | "Psych/Soc",
  "topic": "<specific topic>",
  "passage": "<experimental context, 2–4 sentences>",
  "stem": "<question stem explicitly referencing Figure 1>",
  "optionA": "<choice A>",
  "optionB": "<choice B>",
  "optionC": "<choice C>",
  "optionD": "<choice D>",
  "correctAnswer": "A" | "B" | "C" | "D",
  "explanation": "<detailed explanation referencing what the figure shows>",
  "difficulty": "easy" | "medium" | "hard",
  "figure_prompt": "<detailed image generation prompt: specify chart type (line graph/bar chart/scatter plot/gel/diagram/experimental setup), axis labels with units, data trends, key features, clean white background, publication-quality scientific style, no text overlays except axis labels>"
}`;

const IMAGE_VALIDATION_PROMPT = `You are an MCAT content auditor reviewing image-based questions. Review for:
1. Factual accuracy — flag any scientific errors
2. Answer key correctness — verify the correct answer requires interpreting the described figure
3. Figure necessity — the figure must be ESSENTIAL; flag if question can be answered without it
4. figure_prompt quality — verify it describes a specific, scientifically accurate figure with clear axes/labels/data
5. Distractor quality — flag if multiple choices could be correct or distractors are implausible
6. MCAT alignment — flag if outside MCAT scope

Output ONLY valid JSON:
{
  "pass": true | false,
  "flags": ["<issue 1>", "<issue 2>"],
  "corrected_question": { <full corrected question JSON including figure_prompt, or null if pass=true> }
}`;

// ── Schema ────────────────────────────────────────────────────────────────────

const AdminGenerateSchema = z.object({
  section:         z.enum(["Chem/Phys", "CARS", "Bio/Biochem", "Psych/Soc"]),
  topic:           z.string().optional(),
  count:           z.number().min(1).max(50).default(5),
  model:           z.string().default("claude-opus-4-7"),
  difficulty:      z.enum(["easy", "medium", "hard", "mixed"]).default("mixed"),
  dedupThreshold:  z.number().min(0.3).max(0.99).default(0.75),
  imageGeneration: z.boolean().default(false),
  imageModelId:    z.string().optional(),
});

const DIFFICULTIES = ["easy", "medium", "hard"] as const;

// ── Helpers ───────────────────────────────────────────────────────────────────

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
        model:    opts.modelId,
        messages: [
          { role: "system", content: opts.system },
          { role: "user",   content: opts.userContent },
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
  const msg = await anthropic.messages.create({
    model:      opts.modelId,
    max_tokens: opts.maxTokens,
    system:     opts.system,
    messages:   [{ role: "user", content: opts.userContent }],
  });
  return msg.content[0].type === "text" ? msg.content[0].text : "";
}

async function generateImage(opts: {
  prompt:  string;
  modelId: string;
  baseUrl: string;
  apiKey?: string;
}): Promise<string | null> {
  try {
    const url = `${opts.baseUrl.replace(/\/+$/, "")}/images/generations`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(opts.apiKey ? { Authorization: `Bearer ${opts.apiKey}` } : {}),
      },
      body: JSON.stringify({
        model:           opts.modelId,
        prompt:          opts.prompt,
        n:               1,
        size:            "1024x1024",
        response_format: "b64_json",
      }),
    });
    if (!res.ok) return null;
    const data = await res.json() as { data: Array<{ b64_json?: string; url?: string }> };
    const item = data.data?.[0];
    if (item?.b64_json) return `data:image/png;base64,${item.b64_json}`;
    if (item?.url) return item.url;
    return null;
  } catch {
    return null;
  }
}

// Auto-add figureUrl column if it doesn't exist yet
let figureColChecked = false;
async function ensureFigureColumn() {
  if (figureColChecked) return;
  await db.$executeRawUnsafe(
    `ALTER TABLE "Question" ADD COLUMN IF NOT EXISTS "figureUrl" TEXT`
  ).catch(() => {});
  figureColChecked = true;
}

// ── Route ─────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = AdminGenerateSchema.parse(await req.json());

    const [customGen, customVal] = await Promise.all([
      db.appSetting.findUnique({ where: { key: "generation_prompt" } }),
      db.appSetting.findUnique({ where: { key: "validation_prompt" } }),
    ]);

    const genPrompt = body.imageGeneration
      ? IMAGE_GENERATION_PROMPT
      : (customGen?.value || GENERATION_SYSTEM_PROMPT);

    const valPrompt = body.imageGeneration
      ? IMAGE_VALIDATION_PROMPT
      : (customVal?.value || VALIDATION_SYSTEM_PROMPT);

    const modelConfig = await getModelByModelId(body.model).catch(() => null);

    const imageModelConfig = body.imageGeneration && body.imageModelId
      ? await getModelByModelId(body.imageModelId).catch(() => null)
      : null;

    if (body.imageGeneration) await ensureFigureColumn();

    const existing = await db.question.findMany({
      where:  { section: body.section },
      select: { stem: true },
    });

    const encoder   = new TextEncoder();
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
              body.imageGeneration ? "The question MUST require a figure to answer." : "",
            ].filter(Boolean).join(" ");

            const raw = await callModel({
              modelId:     body.model,
              baseUrl:     modelConfig?.baseUrl,
              apiKey:      modelConfig?.apiKey,
              system:      genPrompt,
              userContent: userMsg,
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
            if (allStems.some((stem) => jaccardSimilarity(stem, parsed.stem as string) > body.dedupThreshold)) {
              enqueue({ type: "skip", reason: "duplicate", index: i });
              continue;
            }

            const valRaw = await callModel({
              modelId:     body.model,
              baseUrl:     modelConfig?.baseUrl,
              apiKey:      modelConfig?.apiKey,
              system:      valPrompt,
              userContent: JSON.stringify(parsed),
              maxTokens:   600,
            });

            let validation: { pass: boolean; flags: string[]; corrected_question: Record<string, unknown> | null };
            try {
              const jsonMatch = valRaw.match(/\{[\s\S]*\}/);
              validation = JSON.parse(jsonMatch ? jsonMatch[0] : valRaw);
            } catch {
              enqueue({ type: "skip", reason: "validation_parse_error", index: i });
              continue;
            }

            if (!validation.pass && !validation.corrected_question) {
              enqueue({ type: "skip", reason: "validation_failed", flags: validation.flags, index: i });
              continue;
            }

            const final = validation.pass ? parsed : (validation.corrected_question ?? parsed);

            // Generate figure image if enabled
            let figureUrl: string | null = null;
            if (body.imageGeneration && imageModelConfig?.baseUrl && final.figure_prompt) {
              const b64 = await generateImage({
                prompt:  final.figure_prompt as string,
                modelId: imageModelConfig.modelId,
                baseUrl: imageModelConfig.baseUrl,
                apiKey:  imageModelConfig.apiKey,
              });
              if (b64) {
                // Try to upload to Firebase Storage; fall back to data URL in DB
                figureUrl = await uploadQuestionImage(b64, `tmp-${Date.now()}-${i}`)
                  .catch(() => b64);
              }
            }

            const saveData: Record<string, unknown> = {
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
            };
            if (figureUrl) saveData.figureUrl = figureUrl;

            const saved = await db.question.create({ data: saveData as Parameters<typeof db.question.create>[0]["data"] });

            // If we stored a temp data URL, re-upload with the real question ID
            if (figureUrl?.startsWith("data:") && body.imageGeneration) {
              const permanentUrl = await uploadQuestionImage(figureUrl, saved.id).catch(() => null);
              if (permanentUrl) {
                figureUrl = permanentUrl;
                await db.question.update({ where: { id: saved.id }, data: { figureUrl } as Record<string, unknown> }).catch(() => {});
              }
            }

            generated.push(final.stem as string);
            enqueue({
              type:     "question",
              question: { ...saved, hasFigure: !!figureUrl },
            });
            syncQuestionToFirestore({ ...saved as unknown as Record<string, unknown>, figureUrl: figureUrl ?? undefined }).catch(() => {});
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
