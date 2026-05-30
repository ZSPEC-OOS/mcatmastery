/**
 * Nightly question generation runner.
 * Run via: npx tsx scripts/generate-nightly.ts
 * Or via GitHub Actions on a cron schedule.
 *
 * Reads automation_config from AppSetting, identifies coverage gaps across all
 * section × topic × subtype × difficulty combinations, and generates questions
 * until every slot is at target or the Anthropic API runs out of credits.
 */

import { config as dotenvConfig } from "dotenv";
dotenvConfig();
import { randomUUID } from "crypto";
import { db, ensureSchema, getSetting } from "../lib/db";
import {
  getQuestions,
  saveQuestion,
  type QuestionDoc,
} from "../lib/firestore";
import { callModel, getModelForRole } from "../lib/model";
import {
  GENERATION_SYSTEM_PROMPT,
  VALIDATION_SYSTEM_PROMPT,
  PASSAGE_SET_SYSTEM_PROMPT,
} from "../lib/anthropic";
import { extractModelJson } from "../lib/parse";
import { jaccardSimilarity } from "../lib/pipeline";
import { SECTION_TOPICS } from "../lib/topics";
import { SECTION_SUBTYPES } from "../lib/subtypes";

// ── Types ─────────────────────────────────────────────────────────────────────

interface AutomationConfig {
  enabled: boolean;
  scheduleUtcHour: number;
  dedupThreshold: number;
  concurrency: number;
  passageSetsEnabled: boolean;
  resumePreviousRun: boolean;
  sections: Record<
    string,
    {
      targetPerTopicSubtype: number;
      targetPerDifficulty: Record<string, number>;
    }
  >;
}

const DEFAULT_CONFIG: AutomationConfig = {
  enabled: true,
  scheduleUtcHour: 2,
  dedupThreshold: 0.75,
  concurrency: 3,
  passageSetsEnabled: true,
  resumePreviousRun: true,
  sections: {
    "Chem/Phys":   { targetPerTopicSubtype: 8,  targetPerDifficulty: { foundational: 5, easy: 10, medium: 10, hard: 5 } },
    "CARS":        { targetPerTopicSubtype: 10, targetPerDifficulty: { foundational: 3, easy: 8,  medium: 12, hard: 7 } },
    "Bio/Biochem": { targetPerTopicSubtype: 8,  targetPerDifficulty: { foundational: 5, easy: 10, medium: 10, hard: 5 } },
    "Psych/Soc":   { targetPerTopicSubtype: 8,  targetPerDifficulty: { foundational: 5, easy: 10, medium: 10, hard: 5 } },
  },
};

interface TaskSpec {
  section: string;
  topic: string;
  subTypeId: string;
  subTypeLabel: string;
  difficulty: string;
  passageBased: boolean;
  gap: number;
}

// ── Concurrency helper ────────────────────────────────────────────────────────

async function withConcurrency<T>(
  tasks: Array<() => Promise<T>>,
  limit: number
): Promise<T[]> {
  const results: T[] = new Array(tasks.length);
  let index = 0;
  const workers = Array.from({ length: Math.min(limit, tasks.length) }, async () => {
    while (index < tasks.length) {
      const i = index++;
      results[i] = await tasks[i]();
    }
  });
  await Promise.all(workers);
  return results;
}

// ── Logging ───────────────────────────────────────────────────────────────────

function log(msg: string) {
  console.log(`[${new Date().toISOString()}] ${msg}`);
}

// ── Gap analysis ──────────────────────────────────────────────────────────────

function buildTaskList(
  existing: QuestionDoc[],
  config: AutomationConfig
): TaskSpec[] {
  const tasks: TaskSpec[] = [];

  for (const [section, sectionCfg] of Object.entries(config.sections)) {
    const topics   = SECTION_TOPICS[section] ?? [];
    const subtypes = SECTION_SUBTYPES[section] ?? [];

    for (const topic of topics) {
      for (const subtype of subtypes) {
        for (const difficulty of ["foundational", "easy", "medium", "hard"]) {
          const target =
            sectionCfg.targetPerDifficulty[difficulty] ??
            Math.round(sectionCfg.targetPerTopicSubtype / 4);

          const count = existing.filter(
            (q) =>
              q.section === section &&
              q.topic === topic &&
              q.subType === subtype.id &&
              q.difficulty === difficulty
          ).length;

          const gap = target - count;
          if (gap > 0) {
            tasks.push({
              section,
              topic,
              subTypeId:    subtype.id,
              subTypeLabel: subtype.label,
              difficulty,
              passageBased: subtype.passageBased,
              gap,
            });
          }
        }
      }
    }
  }

  // Biggest gaps first
  tasks.sort((a, b) => b.gap - a.gap);
  return tasks;
}

// ── Per-question generation ───────────────────────────────────────────────────

async function generateOne(
  task: TaskSpec,
  genPrompt: string,
  valPrompt: string,
  passagePrompt: string,
  modelConfig: { modelId?: string; baseUrl?: string; apiKey?: string; maxTokens?: number; maxReasoningTokens?: number } | null,
  existingStems: string[],
  sessionStems: string[],
  dedupThreshold: number,
): Promise<{ saved: QuestionDoc | null; reason?: string }> {
  const subTypeClause  = ` Subtype: "${task.subTypeLabel}"`;
  const topicClause    = ` Topic: ${task.topic}.`;
  const diffClause     = ` Difficulty: ${task.difficulty}.`;
  const modelOpts = {
    modelId:                 modelConfig?.modelId,
    baseUrl:                 modelConfig?.baseUrl,
    apiKey:                  modelConfig?.apiKey,
    modelMaxTokens:          modelConfig?.maxTokens,
    modelMaxReasoningTokens: modelConfig?.maxReasoningTokens ?? undefined,
  };

  try {
    if (task.passageBased) {
      const setSize = task.section === "CARS"
        ? Math.floor(Math.random() * 3) + 5  // 5-7
        : Math.floor(Math.random() * 3) + 4; // 4-6

      const userMsg = [
        `Generate one ${task.section} passage with ${setSize} questions.`,
        topicClause, subTypeClause, diffClause,
        "Distribute difficulties evenly across the questions.",
      ].join(" ");

      const raw = await callModel({ ...modelOpts, system: passagePrompt, userContent: userMsg, maxTokens: 6000 });

      type PassageSet = { section: string; topic: string; passage: string; questions: Record<string, unknown>[] };
      let passageSet: PassageSet;
      try {
        const parsed = extractModelJson(raw);
        if (!parsed.passage || !Array.isArray(parsed.questions)) throw new Error("missing passage or questions");
        passageSet = parsed as unknown as PassageSet;
      } catch (e) {
        return { saved: null, reason: `parse_error: ${e instanceof Error ? e.message : String(e)}` };
      }

      const allStems = [...existingStems, ...sessionStems];
      const passageGroupId = Math.random().toString(36).slice(2);
      let firstSaved: QuestionDoc | null = null;

      for (const q of passageSet.questions) {
        const stem = q.stem as string;
        if (!stem || !q.optionA || !q.optionB || !q.optionC || !q.optionD || !q.correctAnswer || !q.explanation) continue;
        if (allStems.some((s) => jaccardSimilarity(s, stem) > dedupThreshold)) continue;

        const saved = await saveQuestion({
          section:        passageSet.section || task.section,
          topic:          passageSet.topic   || task.topic,
          subType:        task.subTypeId,
          passageGroupId,
          passage:        passageSet.passage,
          stem,
          optionA:        q.optionA as string,
          optionB:        q.optionB as string,
          optionC:        q.optionC as string,
          optionD:        q.optionD as string,
          correctAnswer:  q.correctAnswer as string,
          explanation:    q.explanation as string,
          difficulty:     (q.difficulty as string) ?? task.difficulty,
          aiGenerated:    true,
        });
        allStems.push(stem);
        sessionStems.push(stem);
        if (!firstSaved) firstSaved = saved;
      }

      return { saved: firstSaved, reason: firstSaved ? undefined : "all_duplicates" };

    } else {
      // Discrete question
      const userMsg = [
        `Generate one ${task.section} question.`,
        topicClause, subTypeClause, diffClause,
      ].join(" ");

      const raw = await callModel({ ...modelOpts, system: genPrompt, userContent: userMsg, maxTokens: 3000 });

      let parsed: Record<string, unknown>;
      try {
        parsed = extractModelJson(raw);
      } catch (e) {
        return { saved: null, reason: `parse_error: ${e instanceof Error ? e.message : String(e)}` };
      }

      const allStems = [...existingStems, ...sessionStems];
      if (allStems.some((s) => jaccardSimilarity(s, parsed.stem as string ?? "") > dedupThreshold)) {
        return { saved: null, reason: "duplicate" };
      }

      const valRaw = await callModel({
        ...modelOpts,
        system:      valPrompt,
        userContent: JSON.stringify({ question: parsed, requestedSubType: task.subTypeLabel }),
        maxTokens:   2000,
      });

      let validation: { pass: boolean; flags: string[]; corrected_question: Record<string, unknown> | null };
      try {
        validation = extractModelJson(valRaw) as typeof validation;
      } catch {
        return { saved: null, reason: "validation_parse_error" };
      }

      if (!validation.pass && !validation.corrected_question) {
        return { saved: null, reason: `validation_failed: ${validation.flags?.join(", ")}` };
      }

      const final = validation.pass ? parsed : (validation.corrected_question ?? parsed);

      const saved = await saveQuestion({
        section:        final.section as string       || task.section,
        topic:          final.topic as string         || task.topic,
        subType:        task.subTypeId,
        passageGroupId: null,
        passage:        (final.passage as string)     ?? null,
        stem:           final.stem as string,
        optionA:        final.optionA as string,
        optionB:        final.optionB as string,
        optionC:        final.optionC as string,
        optionD:        final.optionD as string,
        correctAnswer:  final.correctAnswer as string,
        explanation:    final.explanation as string,
        difficulty:     (final.difficulty as string)  ?? task.difficulty,
        aiGenerated:    true,
      });

      sessionStems.push(final.stem as string);
      return { saved };
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // Surface billing/auth errors immediately so the runner can stop
    if (msg.includes("credit") || msg.includes("billing") || msg.includes("quota") || msg.includes("insufficient")) {
      throw err;
    }
    return { saved: null, reason: `error: ${msg}` };
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  await ensureSchema();

  // Load config
  const rawConfig = await getSetting("automation_config");
  const config: AutomationConfig = rawConfig
    ? { ...DEFAULT_CONFIG, ...JSON.parse(rawConfig) }
    : DEFAULT_CONFIG;

  if (!config.enabled) {
    log("automation_config.enabled=false — exiting");
    process.exit(0);
  }

  // Load prompts (allow custom overrides from admin settings)
  const [customGen, customVal, customPassage] = await Promise.all([
    getSetting("generation_prompt"),
    getSetting("validation_prompt"),
    getSetting("passage_generation_prompt"),
  ]);
  const genPrompt     = customGen     || GENERATION_SYSTEM_PROMPT;
  const valPrompt     = customVal     || VALIDATION_SYSTEM_PROMPT;
  const passagePrompt = customPassage || PASSAGE_SET_SYSTEM_PROMPT;

  // Load model config
  const modelConfig = await getModelForRole("generation");
  if (!modelConfig) {
    log("No generation model configured in Firestore — exiting");
    process.exit(1);
  }
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const resolvedModel = modelConfig!;
  log(`Using model: ${resolvedModel.modelId}`);

  // Resume check: adopt any stuck "running" run from a previous invocation
  let runId: string;
  let pendingTaskIds: string[] = [];

  const stuckRun = await db.generationRun.findFirst({
    where: { status: "running" },
    orderBy: { startedAt: "desc" },
  });

  if (stuckRun && config.resumePreviousRun) {
    runId = stuckRun.id;
    log(`Resuming run ${runId} from ${stuckRun.startedAt.toISOString()}`);
    const pending = await db.generationTask.findMany({
      where: { runId, status: "pending" },
    });
    pendingTaskIds = pending.map((t) => t.id);
    log(`${pendingTaskIds.length} pending tasks to resume`);
  } else {
    if (stuckRun) {
      await db.generationRun.update({ where: { id: stuckRun.id }, data: { status: "failed", completedAt: new Date(), errorMessage: "Abandoned — new run started" } });
    }
    runId = randomUUID();
    await db.generationRun.create({
      data: {
        id:             runId,
        triggeredBy:    process.env.TRIGGERED_BY ?? "scheduler",
        status:         "running",
        configSnapshot: JSON.stringify(config),
        startedAt:      new Date(),
      },
    });
    log(`Started new run ${runId}`);
  }

  // Load all existing questions for gap analysis and dedup
  log("Loading existing questions from Firestore…");
  const existing = await getQuestions({});
  log(`${existing.length} existing questions loaded`);
  const existingStems = existing.map((q) => q.stem);
  const sessionStems: string[] = [];

  // Build or restore task list
  let taskSpecs: TaskSpec[];
  if (pendingTaskIds.length > 0) {
    const rows = await db.generationTask.findMany({ where: { id: { in: pendingTaskIds } } });
    taskSpecs = rows.map((r) => ({
      section:      r.section,
      topic:        r.topic,
      subTypeId:    r.subTypeId,
      subTypeLabel: r.subTypeLabel,
      difficulty:   r.difficulty,
      passageBased: r.passageBased,
      gap:          1,
    }));
  } else {
    taskSpecs = buildTaskList(existing, config);
    log(`${taskSpecs.length} generation tasks identified`);

    // Persist tasks to DB
    if (taskSpecs.length > 0) {
      await db.generationTask.createMany({
        data: taskSpecs.map((t) => ({
          id:           randomUUID(),
          runId,
          section:      t.section,
          topic:        t.topic,
          subTypeId:    t.subTypeId,
          subTypeLabel: t.subTypeLabel,
          difficulty:   t.difficulty,
          passageBased: t.passageBased,
          status:       "pending",
        })),
      });
    }
  }

  if (taskSpecs.length === 0) {
    log("All slots at target — nothing to generate");
    await db.generationRun.update({
      where: { id: runId },
      data: { status: "completed", completedAt: new Date(), report: JSON.stringify({ message: "All slots at target" }) },
    });
    await db.$disconnect();
    return;
  }

  // Fetch task DB IDs so we can update them individually
  const taskRows = await db.generationTask.findMany({
    where: { runId, status: "pending" },
    select: { id: true, section: true, topic: true, subTypeId: true, subTypeLabel: true, difficulty: true, passageBased: true },
  });

  // Execute with concurrency
  let totalAttempted = 0;
  let totalSaved     = 0;
  let totalSkipped   = 0;
  let totalErrors    = 0;
  let billingError   = false;

  const jobs: Array<() => Promise<void>> = taskRows.map((row) => async () => {
    if (billingError) return;

    const spec: TaskSpec = {
      section:      row.section,
      topic:        row.topic,
      subTypeId:    row.subTypeId,
      subTypeLabel: row.subTypeLabel,
      difficulty:   row.difficulty,
      passageBased: row.passageBased,
      gap:          1,
    };

    totalAttempted++;
    log(`[${totalAttempted}] ${spec.section} | ${spec.topic} | ${spec.subTypeLabel} | ${spec.difficulty}`);

    try {
      const result = await generateOne(
        spec, genPrompt, valPrompt, passagePrompt,
        resolvedModel, existingStems, sessionStems, config.dedupThreshold,
      );

      if (result.saved) {
        totalSaved++;
        await db.generationTask.update({
          where: { id: row.id },
          data:  { status: "saved", savedQuestionId: result.saved.id, updatedAt: new Date() },
        });
        log(`  ✓ saved ${result.saved.id}`);
      } else {
        totalSkipped++;
        await db.generationTask.update({
          where: { id: row.id },
          data:  { status: "skipped", skipReason: result.reason ?? "unknown", updatedAt: new Date() },
        });
        log(`  ✗ skipped: ${result.reason}`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      billingError = true;
      totalErrors++;
      await db.generationTask.update({
        where: { id: row.id },
        data:  { status: "error", errorMessage: msg.slice(0, 500), updatedAt: new Date() },
      });
      log(`  ✗ billing/fatal error: ${msg}`);
    }
  });

  await withConcurrency(jobs, config.concurrency);

  const status = billingError ? "partial" : totalErrors > 0 ? "partial" : "completed";
  const report = { totalAttempted, totalSaved, totalSkipped, totalErrors };

  await db.generationRun.update({
    where: { id: runId },
    data: {
      status,
      completedAt:    new Date(),
      totalAttempted,
      totalSaved,
      totalSkipped,
      totalErrors,
      report:         JSON.stringify(report),
      errorMessage:   billingError ? "Stopped: billing/quota error from AI provider" : undefined,
    },
  });

  log(`\nRun ${runId} ${status.toUpperCase()}`);
  log(`  Attempted: ${totalAttempted}  Saved: ${totalSaved}  Skipped: ${totalSkipped}  Errors: ${totalErrors}`);

  await db.$disconnect();
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
