import { NextRequest } from "next/server";
import { getQuestions } from "../../../../lib/firestore";
import { getSetting, ensureSchema } from "../../../../lib/db";
import { callModel } from "../../../../lib/model";
import { extractModelJson } from "../../../../lib/parse";

const DEFAULT_AUDIT_PROMPT = `You are an expert MCAT content auditor. You will receive an MCAT practice question in JSON format. Perform a complete content accuracy and validity audit to detect hallucinations or incorrect material.

Check the following:
1. Factual accuracy — verify all scientific claims, facts, processes, and numbers are correct for MCAT-level content
2. Answer key correctness — verify the marked correct answer is genuinely correct
3. Distractor quality — ensure wrong answers are plausible but clearly incorrect; flag if any wrong answer could also be correct
4. Explanation accuracy — verify the explanation correctly justifies the answer and contains no errors
5. Internal consistency — ensure the passage, stem, options, and explanation are logically consistent
6. MCAT alignment — verify content falls within MCAT scope and appropriate difficulty

If you find NO issues, respond with ONLY this JSON:
{ "pass": true, "issues": [], "corrected_question": null }

If you find any issues, respond with ONLY this JSON (include only changed fields in corrected_question):
{
  "pass": false,
  "issues": ["<specific concise description of issue 1>", "<specific concise description of issue 2>"],
  "corrected_question": {
    "stem": "<corrected stem, only if changed>",
    "passage": "<corrected passage, only if changed>",
    "optionA": "<corrected A, only if changed>",
    "optionB": "<corrected B, only if changed>",
    "optionC": "<corrected C, only if changed>",
    "optionD": "<corrected D, only if changed>",
    "correctAnswer": "<corrected answer letter, only if changed>",
    "explanation": "<corrected explanation, only if changed>"
  }
}

Output ONLY valid JSON. No markdown, no preamble.`;

function sseChunk(data: unknown): string {
  return `data: ${JSON.stringify(data)}\n\n`;
}

export async function POST(_req: NextRequest) {
  await ensureSchema();

  const customAuditPrompt = await getSetting("audit_prompt").catch(() => null);
  const auditSystemPrompt = customAuditPrompt || DEFAULT_AUDIT_PROMPT;

  const questions = await getQuestions({});

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const enqueue = (data: unknown) =>
        controller.enqueue(encoder.encode(sseChunk(data)));

      enqueue({ type: "start", total: questions.length });

      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        enqueue({ type: "progress", current: i + 1, total: questions.length });

        try {
          const userContent = JSON.stringify({
            id: q.id,
            section: q.section,
            topic: q.topic,
            subType: q.subType ?? null,
            passage: q.passage ?? null,
            stem: q.stem,
            optionA: q.optionA,
            optionB: q.optionB,
            optionC: q.optionC,
            optionD: q.optionD,
            correctAnswer: q.correctAnswer,
            explanation: q.explanation,
            difficulty: q.difficulty,
          });

          const raw = await callModel({
            system: auditSystemPrompt,
            userContent,
            maxTokens: 1500,
          });

          const result = extractModelJson(raw) as {
            pass: boolean;
            issues: string[];
            corrected_question: Record<string, string> | null;
          };

          if (!result.pass) {
            enqueue({
              type: "finding",
              questionId: q.id,
              question: q,
              issues: result.issues ?? [],
              correctedQuestion: result.corrected_question ?? null,
            });
          }
        } catch (err) {
          enqueue({ type: "error", questionId: q.id, message: err instanceof Error ? err.message : "unknown" });
        }
      }

      enqueue({ type: "done" });
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
}
