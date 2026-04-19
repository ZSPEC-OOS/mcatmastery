import { NextRequest } from "next/server";
import { requireUser } from "../../../../../lib/auth";
import { db } from "../../../../../lib/db";
import { anthropic, VALIDATION_SYSTEM_PROMPT } from "../../../../../lib/anthropic";
import { isDuplicateStem, verifyAndSave, sseChunk } from "../../../../../lib/pipeline";

export const maxDuration = 300;

const PDF_EXTRACT_SYSTEM = `You are an expert MCAT content synthesizer for official-style question writing.
You MUST stay grounded in the uploaded book content:
- Base every question directly on concepts, details, figures, definitions, and mechanisms present in the PDF.
- Do not introduce outside facts unless they are foundational background needed to interpret the book's content.
- Prefer extracting existing book-style questions when present; otherwise synthesize new questions faithful to the source.
- Remove near-duplicates and avoid repetitive stems.

Produce a diverse set across the section's major subtopics and difficulty levels (easy/medium/hard).

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

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function estimateTargetCount(byteLength: number): number {
  const estimatedPages = Math.max(1, Math.round(byteLength / 120_000));
  return clamp(estimatedPages * 3, 8, 30);
}

function normalizeTopic(topic: unknown): string {
  if (typeof topic !== "string") return "General";
  const cleaned = topic.replace(/\s+/g, " ").trim();
  if (!cleaned) return "General";
  return cleaned
    .split(" ")
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join(" ");
}

function rankCandidate(question: Record<string, unknown>): number {
  const stem = typeof question.stem === "string" ? question.stem.trim() : "";
  const explanation = typeof question.explanation === "string" ? question.explanation.trim() : "";
  const hasAllOptions = ["optionA", "optionB", "optionC", "optionD"].every((k) => typeof question[k] === "string" && String(question[k]).trim().length > 0);
  const hasAnswer = ["A", "B", "C", "D"].includes(String(question.correctAnswer ?? ""));
  const difficultyScore = ["easy", "medium", "hard"].includes(String(question.difficulty ?? "")) ? 1 : 0;
  const passage = typeof question.passage === "string" ? question.passage.trim() : "";
  const passageScore = passage.length >= 120 ? 1 : 0;

  return [
    stem.length >= 45 ? 1 : 0,
    explanation.length >= 120 ? 1 : 0,
    hasAllOptions ? 1 : 0,
    hasAnswer ? 1 : 0,
    difficultyScore,
    passageScore,
  ].reduce((sum, value) => sum + value, 0);
}

export async function POST(req: NextRequest) {
  try {
    await requireUser();

    const formData = await req.formData();
    const file    = formData.get("file") as File | null;
    const section = formData.get("section") as string | null;
    const model   = (formData.get("model") as string) || "claude-opus-4-7";
    const dedupThreshold = clamp(parseFloat((formData.get("dedupThreshold") as string) || "0.72"), 0.35, 0.98);

    if (!file || !section) {
      return new Response(JSON.stringify({ error: "file and section are required" }), { status: 400 });
    }

    const bytes  = await file.arrayBuffer();
    const fileBuffer = Buffer.from(bytes);
    const base64 = fileBuffer.toString("base64");
    const targetCount = estimateTargetCount(fileBuffer.byteLength);
    const extractionCount = targetCount * 3;

    const [customVal, existing] = await Promise.all([
      db.appSetting.findUnique({ where: { key: "validation_prompt" } }),
      db.question.findMany({ where: { section }, select: { stem: true } }),
    ]);
    const valPrompt = customVal?.value || VALIDATION_SYSTEM_PROMPT;

    const encoder     = new TextEncoder();
    const sessionStems: string[] = [];

    const stream = new ReadableStream({
      async start(controller) {
        const enqueue = (data: unknown) => controller.enqueue(encoder.encode(sseChunk(data)));

        enqueue({ type: "status", message: `Sending PDF to Claude for extraction (target ${targetCount})…` });

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
                  text: `Extract or synthesize ${extractionCount} high-quality MCAT-style questions for the "${section}" section from this study material.
Ensure broad topic coverage, high-fidelity alignment to the book's content, and zero near-duplicate stems.
Output only the JSON array.`,
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

        const sectionOnly = questions
          .filter((question) => question && typeof question === "object")
          .map((question) => ({ ...(question as Record<string, unknown>), topic: normalizeTopic((question as Record<string, unknown>).topic) }))
          .filter((question) => String(question.section ?? "") === section);

        sectionOnly.sort((a, b) => {
          const rankDelta = rankCandidate(b) - rankCandidate(a);
          if (rankDelta !== 0) return rankDelta;
          const topicCompare = String(a.topic ?? "").localeCompare(String(b.topic ?? ""));
          if (topicCompare !== 0) return topicCompare;
          return String(a.stem ?? "").localeCompare(String(b.stem ?? ""));
        });

        const preFiltered: Record<string, unknown>[] = [];
        const stagedStems: string[] = [];
        for (const candidate of sectionOnly) {
          const stem = String(candidate.stem ?? "").trim();
          if (!stem) continue;
          if (isDuplicateStem(stem, stagedStems, dedupThreshold)) continue;
          preFiltered.push(candidate);
          stagedStems.push(stem);
          if (preFiltered.length >= targetCount * 2) break;
        }

        const total = preFiltered.length;
        enqueue({ type: "status", message: `Prepared ${total} candidates — running strict dedup & verification…` });

        let saved = 0;
        for (let i = 0; i < total; i++) {
          enqueue({ type: "progress", current: i + 1, total });
          try {
            const result = await verifyAndSave(preFiltered[i], {
              model,
              dedupThreshold,
              existingStems: existing.map((e) => e.stem),
              sessionStems,
              valPrompt,
            });

            if (result.saved) {
              sessionStems.push((preFiltered[i].stem as string) ?? "");
              saved++;
              enqueue({ type: "question", question: result.saved });
              if (saved >= targetCount) break;
            } else {
              enqueue({ type: "skip", reason: result.reason, flags: result.flags, index: i });
            }
          } catch (err) {
            enqueue({ type: "skip", reason: "error", message: err instanceof Error ? err.message : "unknown", index: i });
          }
        }

        enqueue({ type: "done", generated: saved, total: targetCount });
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
