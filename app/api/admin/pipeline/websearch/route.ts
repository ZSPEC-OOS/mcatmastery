import { NextRequest } from "next/server";
import { z } from "zod";
import { anthropic } from "../../../../../lib/anthropic";
import { getQuestions } from "../../../../../lib/firestore";
import { getSetting, ensureSchema } from "../../../../../lib/db";
import { CURRICULUM_SECTIONS } from "../../../../../lib/curriculum-sections";
import { verifyAndSave, sseChunk } from "../../../../../lib/pipeline";
import { VALIDATION_SYSTEM_PROMPT } from "../../../../../lib/anthropic";
import { extractModelJson } from "../../../../../lib/parse";

export const maxDuration = 300;

const Schema = z.object({
  section:        z.enum(["Chem/Phys", "CARS", "Bio/Biochem", "Psych/Soc"]),
  topic:          z.string().optional(),
  count:          z.number().min(1).max(20).default(5),
  dedupThreshold: z.number().min(0.3).max(0.99).default(0.75),
});

function findSparsestTopic(section: string, existing: { topic: string }[]): string {
  const secData = CURRICULUM_SECTIONS.find((s) => s.label === section);
  if (!secData) return "";
  const allTopics = secData.groups.flatMap((g) => g.topics);

  const counts: Record<string, number> = {};
  for (const q of existing) counts[q.topic] = (counts[q.topic] ?? 0) + 1;

  let best = allTopics[0];
  let bestCount = counts[allTopics[0]] ?? 0;
  for (const t of allTopics) {
    const c = counts[t] ?? 0;
    if (c < bestCount) { bestCount = c; best = t; }
  }
  return best;
}

const WEB_SEARCH_SYSTEM = `You are an expert MCAT question researcher. Search the web for authentic, pre-existing MCAT practice questions on the topic and section provided. Extract real questions found on the web from prep courses, practice tests, and educational resources (Kaplan, Princeton Review, Khan Academy, AAMC, BoardVitals, etc.).

Format every extracted question as a JSON object with exactly these fields:
{
  "section": "<section name>",
  "topic": "<exact topic>",
  "passage": "<3-5 sentence passage or null for standalone questions>",
  "stem": "<question stem>",
  "optionA": "<answer choice A>",
  "optionB": "<answer choice B>",
  "optionC": "<answer choice C>",
  "optionD": "<answer choice D>",
  "correctAnswer": "A" | "B" | "C" | "D",
  "explanation": "<why the correct answer is right and why distractors are wrong>",
  "difficulty": "easy" | "medium" | "hard"
}

If the source doesn't include an explanation or answer, generate a concise, accurate one. Output ONLY a valid JSON array of question objects — no markdown, no other text.`;

export async function POST(req: NextRequest) {
  try {
    const body = Schema.parse(await req.json());
    await ensureSchema();

    const encoder  = new TextEncoder();
    const existing = await getQuestions({ section: body.section });

    const stream = new ReadableStream({
      async start(controller) {
        const enqueue = (data: unknown) => {
          try { controller.enqueue(encoder.encode(sseChunk(data))); } catch { /* disconnected */ }
        };

        // Determine target topic
        const topic = body.topic?.trim() || findSparsestTopic(body.section, existing);
        if (!topic) {
          enqueue({ type: "error", message: "Could not determine target topic" });
          controller.close();
          return;
        }

        if (!body.topic?.trim()) {
          enqueue({ type: "status", message: `Auto-selected sparsest topic: "${topic}"` });
        }
        enqueue({ type: "status", message: `Searching the web for MCAT "${topic}" questions…` });

        // Claude web search call
        let rawText: string;
        try {
          const msg = await anthropic.messages.create({
            model:      "claude-opus-4-7",
            max_tokens: 8000,
            tools:      [{ type: "web_search_20250305" as "web_search_20250305", name: "web_search", max_uses: Math.min(body.count, 8) }],
            system:     WEB_SEARCH_SYSTEM,
            messages:   [{
              role:    "user",
              content: `Search the web for up to ${body.count} authentic MCAT practice questions about "${topic}" (${body.section} section). Look across multiple sources. Return a JSON array.`,
            }],
          });

          const textBlock = msg.content.find((b) => b.type === "text");
          if (!textBlock || textBlock.type !== "text" || !textBlock.text) {
            throw new Error("Model returned no text in response");
          }
          rawText = textBlock.text;
        } catch (err) {
          enqueue({ type: "error", message: `Web search failed: ${err instanceof Error ? err.message : String(err)}` });
          controller.close();
          return;
        }

        // Parse questions from the response
        let questions: Record<string, unknown>[];
        try {
          const parsed = extractModelJson(rawText);
          const arr = Array.isArray(parsed.questions) ? parsed.questions : null;
          if (!arr || arr.length === 0) throw new Error("No questions array found");
          questions = (arr as Record<string, unknown>[]).slice(0, body.count);
        } catch (err) {
          enqueue({ type: "error", message: `Could not parse questions from response: ${err instanceof Error ? err.message : String(err)}` });
          controller.close();
          return;
        }

        const total = questions.length;
        enqueue({ type: "status", message: `Found ${total} question${total !== 1 ? "s" : ""} — validating and saving…` });
        enqueue({ type: "progress", current: 0, total });

        const valPrompt     = (await getSetting("validation_prompt").catch(() => "")) || VALIDATION_SYSTEM_PROMPT;
        const existingStems = existing.map((q) => q.stem);
        const sessionStems: string[] = [];
        let saved = 0;

        for (let i = 0; i < total; i++) {
          // Force section + topic to match what was requested
          const q: Record<string, unknown> = { ...questions[i], section: body.section, topic };

          const result = await verifyAndSave(q, {
            dedupThreshold: body.dedupThreshold,
            existingStems,
            sessionStems,
            valPrompt,
          });

          enqueue({ type: "progress", current: i + 1, total });

          if (result.saved) {
            sessionStems.push((q.stem as string) ?? "");
            saved++;
            enqueue({ type: "question", question: result.saved });
          } else {
            enqueue({ type: "skip", reason: result.reason, flags: result.flags, index: i });
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
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }), { status: 500 });
  }
}
