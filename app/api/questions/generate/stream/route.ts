import { NextRequest } from "next/server";
import { z } from "zod";
import { requireUser } from "../../../../../lib/auth";
import { db } from "../../../../../lib/db";
import { anthropic, GENERATION_SYSTEM_PROMPT, VALIDATION_SYSTEM_PROMPT } from "../../../../../lib/anthropic";

const GenerateSchema = z.object({
  section: z.enum(["Chem/Phys", "CARS", "Bio/Biochem", "Psych/Soc"]),
  topic: z.string().optional(),
  count: z.number().min(1).max(10).default(5),
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
    await requireUser();
    const body = GenerateSchema.parse(await req.json());

    const existing = await db.question.findMany({
      where: { section: body.section },
      select: { stem: true },
      take: 50,
      orderBy: { createdAt: "desc" },
    });

    const encoder = new TextEncoder();
    const generated: string[] = [];

    const stream = new ReadableStream({
      async start(controller) {
        const enqueue = (data: unknown) =>
          controller.enqueue(encoder.encode(sseChunk(data)));

        for (let i = 0; i < body.count; i++) {
          enqueue({ type: "progress", current: i + 1, total: body.count });

          try {
            const genMsg = await anthropic.messages.create({
              model: "claude-opus-4-7",
              max_tokens: 1024,
              system: GENERATION_SYSTEM_PROMPT,
              messages: [
                {
                  role: "user",
                  content: `Generate one ${body.section} question${body.topic ? ` about ${body.topic}` : ""}.`,
                },
              ],
            });

            const raw = genMsg.content[0].type === "text" ? genMsg.content[0].text : "";
            let parsed: Record<string, unknown>;
            try {
              parsed = JSON.parse(raw);
            } catch {
              continue;
            }

            const allStems = [...existing.map((q) => q.stem), ...generated];
            const isDup = allStems.some(
              (stem) => jaccardSimilarity(stem, parsed.stem as string) > 0.75
            );
            if (isDup) {
              enqueue({ type: "skip", reason: "duplicate", index: i });
              continue;
            }

            const valMsg = await anthropic.messages.create({
              model: "claude-opus-4-7",
              max_tokens: 512,
              system: VALIDATION_SYSTEM_PROMPT,
              messages: [{ role: "user", content: JSON.stringify(parsed) }],
            });

            const valRaw = valMsg.content[0].type === "text" ? valMsg.content[0].text : "{}";
            let validation: { pass: boolean; corrected_question: Record<string, unknown> | null };
            try {
              validation = JSON.parse(valRaw);
            } catch {
              continue;
            }

            const final = validation.pass ? parsed : (validation.corrected_question ?? parsed);

            const saved = await db.question.create({
              data: {
                section: final.section as string,
                topic: final.topic as string,
                passage: (final.passage as string) ?? null,
                stem: final.stem as string,
                optionA: final.optionA as string,
                optionB: final.optionB as string,
                optionC: final.optionC as string,
                optionD: final.optionD as string,
                correctAnswer: final.correctAnswer as string,
                explanation: final.explanation as string,
                difficulty: (final.difficulty as string) ?? "medium",
              },
            });

            generated.push(final.stem as string);
            enqueue({ type: "question", question: saved });
          } catch {
            // skip individual failures and continue
          }
        }

        enqueue({ type: "done", generated: generated.length });
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (err) {
    if (err instanceof z.ZodError)
      return new Response(JSON.stringify({ error: err.issues }), { status: 400 });
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }
}
