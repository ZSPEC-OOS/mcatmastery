import { NextRequest } from "next/server";
import { getQuestions, updateQuestion } from "../../../../lib/firestore";
import type { QuestionDoc } from "../../../../lib/firestore";
import { getSetting, ensureSchema } from "../../../../lib/db";
import { callModel, getModelForRole } from "../../../../lib/model";
import { extractModelJson } from "../../../../lib/parse";

const DEFAULT_AUDIT_PROMPT = `You are an expert MCAT content auditor. You will receive an MCAT practice question in JSON format. Perform a complete content accuracy and validity audit to detect hallucinations or incorrect material.

Check the following:
1. Factual accuracy — verify all scientific claims, facts, processes, and numbers are correct for MCAT-level content
2. Answer key correctness — verify the marked correct answer is genuinely correct
3. Distractor quality — ensure wrong answers are plausible but clearly incorrect; flag if any wrong answer could also be correct
4. Explanation accuracy — verify the explanation correctly justifies the answer and contains no errors
5. Internal consistency — ensure the passage, stem, options, and explanation are logically consistent
6. MCAT alignment — verify content falls within MCAT scope and appropriate difficulty
7. Figure consistency — the question includes a "hasFigure" field. If hasFigure is true, the stem should explicitly reference a figure (e.g. "Based on Figure 1…"). If hasFigure is false but the stem references a figure, flag it as a missing figure. If hasFigure is true but the stem never references the figure, flag it as an unused figure.
8. Passage dependency — ONLY apply this check if the "passage" field in the JSON is a non-null, non-empty string. If passage is null or empty, skip this criterion entirely and do NOT flag anything related to passage dependency, passage context, or experimental data in the stem. If a passage IS present: verify the question cannot be correctly answered from general MCAT knowledge alone without reading it; flag if the passage is purely descriptive with no data hook or mechanistic detail the question exploits; flag if the stem or explanation references information absent from the passage.

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

const DEFAULT_PASSAGE_SET_AUDIT_PROMPT = `You are an expert MCAT content auditor. You will receive a JSON object with one shared passage and N questions forming a cohesive passage-based question set. Audit everything together.

Audit the PASSAGE for:
1. Factual accuracy — all scientific claims, numbers, and processes are correct at MCAT level
2. MCAT passage structure — passage includes at least one interpretable dataset (a table or numerically described result), integrates 2+ concepts across domains, and has sufficient mechanistic depth to support reasoning questions
3. Internal consistency — passage content is self-consistent throughout; no contradictions

Audit each QUESTION for:
4. Passage dependency — the question cannot be correctly answered without reading the passage; not free-standing factual recall
5. Answer key correctness — the marked correct answer is genuinely correct given the passage
6. Distractor quality — wrong answers are plausible but clearly incorrect; no distractor is also a defensible correct interpretation
7. Explanation accuracy — explanation correctly cites passage evidence and contains no scientific errors
8. Stem quality — stem uses AAMC precision language ("most likely", "best supported", "most consistent with", etc.) and requires multi-step reasoning

Audit the SET as a whole for:
9. Coverage diversity — no two questions test the same passage sentence or the same cognitive move
10. Difficulty distribution — set includes a reasonable spread across easy, medium, and hard

Output ONLY valid JSON in this exact shape:
{
  "passagePass": true | false,
  "passageIssues": ["<passage-level issue description>"],
  "correctedPassage": "<full corrected passage text, or null if passagePass is true>",
  "questions": [
    {
      "id": "<question id from input>",
      "pass": true | false,
      "issues": ["<specific issue>"],
      "corrected_question": { "<only changed fields: stem, optionA-D, correctAnswer, explanation>" } | null
    }
  ]
}

Output ONLY valid JSON. No markdown, no preamble.`;

function sseChunk(data: unknown): string {
  return `data: ${JSON.stringify(data)}\n\n`;
}

export const maxDuration = 300; // 5 minutes — maximum on Vercel Pro

export async function POST(_req: NextRequest) {
  await ensureSchema();

  const [customAuditPrompt, customPassageSetAuditPrompt, auditModel] = await Promise.all([
    getSetting("audit_prompt").catch(() => null),
    getSetting("passage_set_audit_prompt").catch(() => null),
    getModelForRole("audit"),
  ]);
  const auditSystemPrompt     = customAuditPrompt        || DEFAULT_AUDIT_PROMPT;
  const passageSetAuditPrompt = customPassageSetAuditPrompt || DEFAULT_PASSAGE_SET_AUDIT_PROMPT;

  const modelOpts = auditModel
    ? { modelId: auditModel.modelId, baseUrl: auditModel.baseUrl || undefined, apiKey: auditModel.apiKey || undefined }
    : {};

  const allQuestions = await getQuestions({});
  // Only audit questions that haven't been audited yet
  const questions = allQuestions.filter((q) => q.auditStatus !== "audited");

  // Split into passage groups and discrete questions
  const passageGroups = new Map<string, QuestionDoc[]>();
  const discrete: QuestionDoc[] = [];

  for (const q of questions) {
    if (q.passageGroupId) {
      const group = passageGroups.get(q.passageGroupId) ?? [];
      group.push(q);
      passageGroups.set(q.passageGroupId, group);
    } else {
      discrete.push(q);
    }
  }

  // Total audit items: one per passage group + one per discrete question
  const totalItems = passageGroups.size + discrete.length;

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const enqueue = (data: unknown) => {
        try { controller.enqueue(encoder.encode(sseChunk(data))); } catch { /* client disconnected */ }
      };

      enqueue({ type: "start", total: totalItems });
      let processed = 0;

      // ── Passage group audits ────────────────────────────────────────────────
      for (const [, groupQs] of passageGroups) {
        processed++;
        enqueue({ type: "progress", current: processed, total: totalItems });

        try {
          const userContent = JSON.stringify({
            passage: groupQs[0].passage ?? "",
            questions: groupQs.map((q) => ({
              id: q.id,
              section: q.section,
              topic: q.topic,
              subType: q.subType ?? null,
              stem: q.stem,
              optionA: q.optionA,
              optionB: q.optionB,
              optionC: q.optionC,
              optionD: q.optionD,
              correctAnswer: q.correctAnswer,
              explanation: q.explanation,
              difficulty: q.difficulty,
            })),
          });

          const raw = await callModel({
            ...modelOpts,
            system: passageSetAuditPrompt,
            userContent,
            maxTokens: 16000,
          });

          const result = extractModelJson(raw) as {
            passagePass: boolean;
            passageIssues: string[];
            correctedPassage: string | null;
            questions: Array<{
              id: string;
              pass: boolean;
              issues: string[];
              corrected_question: Record<string, string> | null;
            }>;
          };

          // Track which question IDs have findings so we know which passed
          const findingIds = new Set<string>();

          // Passage-level finding — attributed to the first question in the group
          if (!result.passagePass && result.passageIssues?.length > 0) {
            const firstQ = groupQs[0];
            findingIds.add(firstQ.id);
            enqueue({
              type: "finding",
              questionId: firstQ.id,
              question: firstQ,
              issues: result.passageIssues.map((i) => `[Passage] ${i}`),
              correctedQuestion: result.correctedPassage
                ? { passage: result.correctedPassage }
                : null,
            });
          }

          // Per-question findings
          for (const qResult of result.questions ?? []) {
            if (!qResult.pass && qResult.issues?.length > 0) {
              const q = groupQs.find((gq) => gq.id === qResult.id);
              if (q) {
                findingIds.add(q.id);
                enqueue({
                  type: "finding",
                  questionId: q.id,
                  question: q,
                  issues: qResult.issues,
                  correctedQuestion: qResult.corrected_question ?? null,
                });
              }
            }
          }

          // Mark questions that had no findings as audited
          const passedIds = groupQs.filter((q) => !findingIds.has(q.id)).map((q) => q.id);
          if (passedIds.length > 0) {
            await Promise.all(passedIds.map((id) => updateQuestion(id, { auditStatus: "audited" })));
            enqueue({ type: "passed", questionIds: passedIds });
          }
        } catch (err) {
          enqueue({
            type: "error",
            questionId: groupQs[0].id,
            message: err instanceof Error ? err.message : "unknown",
          });
        }
      }

      // ── Discrete question audits ────────────────────────────────────────────
      for (const q of discrete) {
        processed++;
        enqueue({ type: "progress", current: processed, total: totalItems });

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
            hasFigure: !!q.figureUrl,
          });

          const raw = await callModel({
            ...modelOpts,
            system: auditSystemPrompt,
            userContent,
            maxTokens: 12000,
          });

          const result = extractModelJson(raw) as {
            pass: boolean;
            issues: string[];
            corrected_question: Record<string, string> | null;
          };

          const hasIssues = Array.isArray(result.issues) && result.issues.length > 0;
          const hasFix    = !!result.corrected_question && Object.keys(result.corrected_question).length > 0;

          if (result.pass || (!hasIssues && !hasFix)) {
            // Pass — or model said fail but couldn't articulate anything (treat as pass)
            await updateQuestion(q.id, { auditStatus: "audited" });
            enqueue({ type: "passed", questionIds: [q.id] });
          } else {
            enqueue({
              type: "finding",
              questionId: q.id,
              question: q,
              issues: result.issues ?? [],
              correctedQuestion: result.corrected_question ?? null,
            });
          }
        } catch (err) {
          enqueue({
            type: "error",
            questionId: q.id,
            message: err instanceof Error ? err.message : "unknown",
          });
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
