import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "../../../../../lib/db";
import { anthropic, VALIDATION_SYSTEM_PROMPT } from "../../../../../lib/anthropic";
import { verifyAndSave, sseChunk } from "../../../../../lib/pipeline";

export const maxDuration = 300;

const WispSchema = z.object({
  wispEndpoint:   z.string().url(),
  wispApiKey:     z.string().optional(),
  section:        z.enum(["Chem/Phys", "CARS", "Bio/Biochem", "Psych/Soc"]),
  topic:          z.string().optional(),
  count:          z.number().min(1).max(50).default(5),
  model:          z.string().default("claude-opus-4-7"),
  dedupThreshold: z.number().min(0.3).max(0.99).default(0.75),
});

const WISP_REFINE_SYSTEM = `You are an expert MCAT question writer. Given web content that may include MCAT questions or study material:

- If an explicit MCAT-style question is present, extract it (with corrections for any errors).
- Otherwise, generate one new MCAT-quality question inspired by the content.

Output ONLY valid JSON with this exact shape:
{
  "section": "Chem/Phys" | "CARS" | "Bio/Biochem" | "Psych/Soc",
  "topic": "<one canonical MCAT topic>",
  "passage": "<3-5 sentence passage or null>",
  "stem": "<question stem>",
  "optionA": "<choice A>",
  "optionB": "<choice B>",
  "optionC": "<choice C>",
  "optionD": "<choice D>",
  "correctAnswer": "A" | "B" | "C" | "D",
  "explanation": "<detailed explanation>",
  "difficulty": "easy" | "medium" | "hard"
}`;

type WispResult = { title?: string; url?: string; snippet?: string; content?: string };

export async function POST(req: NextRequest) {
  try {
    const body = WispSchema.parse(await req.json());

    const [customVal, existing] = await Promise.all([
      db.appSetting.findUnique({ where: { key: "validation_prompt" } }),
      db.question.findMany({ where: { section: body.section }, select: { stem: true } }),
    ]);
    const valPrompt = customVal?.value || VALIDATION_SYSTEM_PROMPT;

    const encoder      = new TextEncoder();
    const sessionStems: string[] = [];

    const stream = new ReadableStream({
      async start(controller) {
        const enqueue = (data: unknown) => controller.enqueue(encoder.encode(sseChunk(data)));

        const query = ["MCAT practice questions", body.section, body.topic].filter(Boolean).join(" ");
        enqueue({ type: "status", message: `Searching WISP for "${query}"…` });

        let results: WispResult[];
        try {
          const headers: Record<string, string> = { Accept: "application/json" };
          if (body.wispApiKey) headers["Authorization"] = `Bearer ${body.wispApiKey}`;

          const wispUrl = `${body.wispEndpoint.replace(/\/$/, "")}/search?q=${encodeURIComponent(query)}&limit=${body.count}`;
          const wispRes = await fetch(wispUrl, { headers });
          if (!wispRes.ok) throw new Error(`WISP returned ${wispRes.status}`);
          const wispData = await wispRes.json() as Record<string, unknown>;
          results = (
            (wispData.results ?? wispData.data ?? wispData.items ?? []) as WispResult[]
          ).slice(0, body.count);
        } catch (err) {
          enqueue({ type: "error", message: `WISP search failed: ${err instanceof Error ? err.message : "unknown"}` });
          controller.close();
          return;
        }

        const total = results.length;
        enqueue({ type: "status", message: `Found ${total} sources — extracting & verifying…` });

        let saved = 0;
        for (let i = 0; i < total; i++) {
          enqueue({ type: "progress", current: i + 1, total });

          const src = results[i];
          const content = (src.content ?? src.snippet ?? src.title ?? "").slice(0, 3000);

          try {
            const refineMsg = await anthropic.messages.create({
              model: body.model,
              max_tokens: 1024,
              system: WISP_REFINE_SYSTEM,
              messages: [{
                role: "user",
                content: [
                  `Source: ${src.title ?? "unknown"}`,
                  src.url ? `URL: ${src.url}` : "",
                  "",
                  content,
                  "",
                  `Generate one ${body.section} question${body.topic ? ` about ${body.topic}` : ""}. Output only JSON.`,
                ].filter((l) => l !== undefined).join("\n"),
              }],
            });

            const raw = refineMsg.content[0].type === "text" ? refineMsg.content[0].text : "";
            const jsonMatch = raw.match(/\{[\s\S]*\}/);
            if (!jsonMatch) { enqueue({ type: "skip", reason: "parse_error", index: i }); continue; }

            let parsed: Record<string, unknown>;
            try { parsed = JSON.parse(jsonMatch[0]); } catch {
              enqueue({ type: "skip", reason: "parse_error", index: i });
              continue;
            }

            const result = await verifyAndSave(parsed, {
              model:          body.model,
              dedupThreshold: body.dedupThreshold,
              existingStems:  existing.map((e) => e.stem),
              sessionStems,
              valPrompt,
            });

            if (result.saved) {
              sessionStems.push((parsed.stem as string) ?? "");
              saved++;
              enqueue({ type: "question", question: result.saved, source: src.url });
            } else {
              enqueue({ type: "skip", reason: result.reason, flags: result.flags, index: i, source: src.url });
            }
          } catch (err) {
            enqueue({ type: "skip", reason: "error", message: err instanceof Error ? err.message : "unknown", index: i });
          }
        }

        enqueue({ type: "done", generated: saved, total });
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
