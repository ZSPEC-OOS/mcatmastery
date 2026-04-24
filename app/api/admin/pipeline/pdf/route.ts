import { NextRequest } from "next/server";
import { db, getSetting } from "../../../../../lib/db";
import { anthropic, VALIDATION_SYSTEM_PROMPT } from "../../../../../lib/anthropic";
import { verifyAndSave, sseChunk } from "../../../../../lib/pipeline";

export const maxDuration = 300;

const PDF_EXTRACT_SYSTEM = `You are an expert MCAT question extractor and writer. Given study material from an MCAT prep book:

1. Extract verbatim MCAT-style questions if the material contains them, correcting any errors.
2. OR generate new MCAT-quality questions based on the concepts covered.

Each question MUST follow this exact JSON shape:
{
  "section": "Chem/Phys" | "CARS" | "Bio/Biochem" | "Psych/Soc",
  "topic": "<one canonical MCAT topic>",
  "passage": "<3-5 sentence passage or null for discrete questions>",
  "stem": "<question stem>",
  "optionA": "<choice A>",
  "optionB": "<choice B>",
  "optionC": "<choice C>",
  "optionD": "<choice D>",
  "correctAnswer": "A" | "B" | "C" | "D",
  "explanation": "<3-6 sentence explanation covering why correct and why each distractor is wrong>",
  "difficulty": "easy" | "medium" | "hard"
}

Output ONLY a valid JSON array of question objects — no other text, no markdown fences.`;

export async function POST(req: NextRequest) {
  try {

    const formData = await req.formData();
    const file    = formData.get("file") as File | null;
    const section = formData.get("section") as string | null;
    const count   = parseInt((formData.get("count") as string) || "5");
    const model   = (formData.get("model") as string) || "claude-opus-4-7";
    const dedupThreshold = parseFloat((formData.get("dedupThreshold") as string) || "0.75");

    if (!file || !section) {
      return new Response(JSON.stringify({ error: "file and section are required" }), { status: 400 });
    }

    const bytes  = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString("base64");

    const [customVal, existing] = await Promise.all([
      getSetting("validation_prompt"),
      db.question.findMany({ where: { section }, select: { stem: true } }),
    ]);
    const valPrompt = customVal || VALIDATION_SYSTEM_PROMPT;

    const encoder     = new TextEncoder();
    const sessionStems: string[] = [];

    const stream = new ReadableStream({
      async start(controller) {
        const enqueue = (data: unknown) => controller.enqueue(encoder.encode(sseChunk(data)));

        enqueue({ type: "status", message: "Sending PDF to Claude for extraction…" });

        let questions: Record<string, unknown>[];
        try {
          const extractMsg = await (anthropic.beta.messages as unknown as {
            create: (params: unknown) => Promise<{ content: Array<{ type: string; text?: string }> }>;
          }).create({
            model,
            max_tokens: 8192,
            system: PDF_EXTRACT_SYSTEM,
            messages: [{
              role: "user",
              content: [
                {
                  type: "document",
                  source: { type: "base64", media_type: "application/pdf", data: base64 },
                },
                {
                  type: "text",
                  text: `Extract or generate exactly ${count} high-quality MCAT-style questions for the "${section}" section from this study material. Output only the JSON array.`,
                },
              ],
            }],
          });

          const raw = extractMsg.content[0].type === "text" ? (extractMsg.content[0].text ?? "[]") : "[]";
          const jsonMatch = raw.match(/\[[\s\S]*\]/);
          questions = JSON.parse(jsonMatch ? jsonMatch[0] : raw);
          if (!Array.isArray(questions)) throw new Error("Expected array");
        } catch (err) {
          enqueue({ type: "error", message: `Extraction failed: ${err instanceof Error ? err.message : "unknown"}` });
          controller.close();
          return;
        }

        const total = questions.length;
        enqueue({ type: "status", message: `Extracted ${total} candidates — running dedup & verification…` });

        let saved = 0;
        for (let i = 0; i < total; i++) {
          enqueue({ type: "progress", current: i + 1, total });
          try {
            const result = await verifyAndSave(questions[i], {
              model,
              dedupThreshold,
              existingStems: existing.map((e) => e.stem),
              sessionStems,
              valPrompt,
            });

            if (result.saved) {
              sessionStems.push((questions[i].stem as string) ?? "");
              saved++;
              enqueue({ type: "question", question: result.saved });
            } else {
              enqueue({ type: "skip", reason: result.reason, flags: result.flags, index: i });
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
  } catch {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }
}
