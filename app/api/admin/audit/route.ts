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
    "optionA": "<corrected A, only if changed>",
    "optionB": "<corrected B, only if changed>",
    "optionC": "<corrected C, only if changed>",
    "optionD": "<corrected D, only if changed>",
    "correctAnswer": "<corrected answer letter, only if changed>",
    "explanation": "<corrected explanation, only if changed>"
  }
}

Output ONLY valid JSON. No markdown, no preamble.`;

const DEFAULT_PASSAGE_AUDIT_PROMPT = `You are an expert MCAT content auditor. You will receive a passage in JSON format. Audit only the passage itself — do not audit any questions.

Audit the passage for:
1. Factual accuracy — all scientific claims, numbers, and processes are correct at MCAT level
2. MCAT passage structure — passage includes at least one interpretable dataset (a table or numerically described result), integrates 2+ concepts across domains, and has sufficient mechanistic depth to support reasoning questions
3. Internal consistency — passage content is self-consistent throughout; no contradictions

If you find NO issues, respond with ONLY this JSON:
{ "pass": true, "issues": [], "correctedPassage": null }

If you find any issues, respond with ONLY this JSON (provide the full corrected passage text):
{
  "pass": false,
  "issues": ["<specific concise description of issue 1>", "<specific concise description of issue 2>"],
  "correctedPassage": "<full corrected passage text>"
}

Output ONLY valid JSON. No markdown, no preamble.`;

function sseChunk(data: unknown): string {
  return `data: ${JSON.stringify(data)}\n\n`;
}

export const maxDuration = 300; // 5 minutes — maximum on Vercel Pro

export async function POST(req: NextRequest) {
  await ensureSchema();

  const body = await req.json().catch(() => ({})) as { limit?: number };
  const limit = typeof body.limit === "number" && body.limit > 0 ? body.limit : null;

  const [customAuditPrompt, customPassageAuditPrompt, auditModel] = await Promise.all([
    getSetting("audit_prompt").catch(() => null),
    getSetting("passage_audit_prompt").catch(() => null),
    getModelForRole("audit"),
  ]);
  const auditSystemPrompt  = customAuditPrompt        || DEFAULT_AUDIT_PROMPT;
  const passageAuditPrompt = customPassageAuditPrompt || DEFAULT_PASSAGE_AUDIT_PROMPT;

  const modelOpts = auditModel
    ? { modelId: auditModel.modelId, baseUrl: auditModel.baseUrl || undefined, apiKey: auditModel.apiKey || undefined, modelMaxTokens: auditModel.maxTokens || undefined, modelMaxReasoningTokens: auditModel.maxReasoningTokens || undefined }
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

  // Apply limit: fill from passage groups first, then discrete
  let passageGroupEntries = [...passageGroups.entries()];
  let discreteItems = discrete;
  if (limit !== null) {
    const totalGroups = passageGroupEntries.length;
    if (limit <= totalGroups) {
      passageGroupEntries = passageGroupEntries.slice(0, limit);
      discreteItems = [];
    } else {
      discreteItems = discrete.slice(0, limit - totalGroups);
    }
  }

  // Each passage group = 1 passage audit + N question audits; each discrete = 1 audit
  const totalItems =
    passageGroupEntries.reduce((sum, [, qs]) => sum + 1 + qs.length, 0) +
    discreteItems.length;

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let clientConnected = !req.signal.aborted;
      req.signal.addEventListener("abort", () => { clientConnected = false; });

      const enqueue = (data: unknown) => {
        try { controller.enqueue(encoder.encode(sseChunk(data))); } catch { clientConnected = false; }
      };

      enqueue({ type: "start", total: totalItems });
      let processed = 0;

      // ── Passage group audits ────────────────────────────────────────────────
      for (const [, groupQs] of passageGroupEntries) {
        if (!clientConnected) break;

        const findingIds = new Set<string>();

        // ── Phase 1: audit the passage once ──────────────────────────────────
        processed++;
        enqueue({ type: "progress", current: processed, total: totalItems });
        if (!clientConnected) break;

        let activePassage = groupQs[0].passage ?? "";

        try {
          const passageContent = JSON.stringify({
            section: groupQs[0].section,
            topic: groupQs[0].topic,
            passage: activePassage,
          });

          const passageRaw = await callModel({
            ...modelOpts,
            system: passageAuditPrompt,
            userContent: passageContent,
            maxTokens: 8000,
          });

          const passageResult = extractModelJson(passageRaw) as {
            pass: boolean;
            issues: string[];
            correctedPassage: string | null;
          };

          if (!passageResult.pass && passageResult.issues?.length > 0) {
            const firstQ = groupQs[0];
            findingIds.add(firstQ.id);
            enqueue({
              type: "finding",
              questionId: firstQ.id,
              question: firstQ,
              // passageGroupIds lets the client propagate the corrected passage to all siblings
              passageGroupIds: groupQs.map((q) => q.id),
              issues: passageResult.issues.map((i) => `[Passage] ${i}`),
              correctedQuestion: passageResult.correctedPassage
                ? { passage: passageResult.correctedPassage }
                : null,
            });
            if (passageResult.correctedPassage) {
              activePassage = passageResult.correctedPassage;
            }
          }
        } catch (err) {
          enqueue({
            type: "error",
            questionId: groupQs[0].id,
            message: err instanceof Error ? err.message : "unknown",
          });
        }

        // ── Phase 2: audit each question against the (possibly corrected) passage
        for (const q of groupQs) {
          if (!clientConnected) break;
          processed++;
          enqueue({ type: "progress", current: processed, total: totalItems });
          if (!clientConnected) break;

          try {
            const userContent = JSON.stringify({
              id: q.id,
              section: q.section,
              topic: q.topic,
              subType: q.subType ?? null,
              passage: activePassage,
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

            if (!result.pass && (hasIssues || hasFix)) {
              findingIds.add(q.id);
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

        // Mark questions with no findings as audited + passed
        const passedIds = groupQs.filter((q) => !findingIds.has(q.id)).map((q) => q.id);
        if (passedIds.length > 0) {
          await Promise.all(passedIds.map((id) => updateQuestion(id, { auditStatus: "audited" })));
          enqueue({ type: "passed", questionIds: passedIds });
        }
        // Mark finding questions as audited so they leave the queue
        const findingQIds = [...findingIds];
        if (findingQIds.length > 0) {
          await Promise.all(findingQIds.map((id) => updateQuestion(id, { auditStatus: "audited" })));
        }
      }

      // ── Discrete question audits ────────────────────────────────────────────
      for (const q of discreteItems) {
        if (!clientConnected) break;
        processed++;
        enqueue({ type: "progress", current: processed, total: totalItems });
        if (!clientConnected) break;

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
            await updateQuestion(q.id, { auditStatus: "audited" });
            enqueue({ type: "passed", questionIds: [q.id] });
          } else {
            await updateQuestion(q.id, { auditStatus: "audited" });
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

      if (clientConnected) enqueue({ type: "done" });
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
