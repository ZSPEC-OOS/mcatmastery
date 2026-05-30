import { NextRequest, NextResponse } from "next/server";
import { db, ensureSchema, getSetting, setSetting } from "../../../../lib/db";
import { getQuestions } from "../../../../lib/firestore";
import { SECTION_TOPICS } from "../../../../lib/topics";
import { SECTION_SUBTYPES } from "../../../../lib/subtypes";

const REPO   = "ZSPEC-OOS/mcatmastery";
const WORKFLOW = "nightly-generation.yml";

const DEFAULT_CONFIG = {
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

export async function GET() {
  try {
    await ensureSchema();

    const [rawConfig, githubToken, existing, recentRuns] = await Promise.all([
      getSetting("automation_config"),
      getSetting("github_token"),
      getQuestions({}),
      db.generationRun.findMany({
        orderBy: { startedAt: "desc" },
        take: 10,
        select: {
          id: true, triggeredBy: true, status: true,
          startedAt: true, completedAt: true,
          totalAttempted: true, totalSaved: true,
          totalSkipped: true, totalErrors: true,
          errorMessage: true,
        },
      }),
    ]);

    const config = rawConfig ? { ...DEFAULT_CONFIG, ...JSON.parse(rawConfig) } : DEFAULT_CONFIG;

    // Build coverage matrix: section → topic → subtype → difficulty → { count, target }
    const coverage: Record<string, Record<string, Record<string, Record<string, { count: number; target: number }>>>> = {};

    type SectionCfg = { targetPerTopicSubtype: number; targetPerDifficulty: Record<string, number> };
    for (const [section, sectionCfg] of Object.entries(config.sections as Record<string, SectionCfg>)) {
      coverage[section] = {};
      const topics   = SECTION_TOPICS[section] ?? [];
      const subtypes = SECTION_SUBTYPES[section] ?? [];

      for (const topic of topics) {
        coverage[section][topic] = {};
        for (const subtype of subtypes) {
          coverage[section][topic][subtype.id] = {};
          for (const diff of ["foundational", "easy", "medium", "hard"]) {
            const target = sectionCfg.targetPerDifficulty[diff] ?? Math.round(sectionCfg.targetPerTopicSubtype / 4);
            const count  = existing.filter(
              (q) => q.section === section && q.topic === topic && q.subType === subtype.id && q.difficulty === diff
            ).length;
            coverage[section][topic][subtype.id][diff] = { count, target };
          }
        }
      }
    }

    return NextResponse.json({
      config,
      coverage,
      recentRuns,
      totalQuestions: existing.length,
      githubTokenSet: !!githubToken,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await ensureSchema();
    const body = await req.json() as { action: string; config?: unknown; token?: string; ref?: string };

    if (body.action === "save_config") {
      await setSetting("automation_config", JSON.stringify(body.config));
      return NextResponse.json({ success: true });
    }

    if (body.action === "save_token") {
      if (!body.token) return NextResponse.json({ error: "token required" }, { status: 400 });
      await setSetting("github_token", body.token.trim());
      return NextResponse.json({ success: true });
    }

    if (body.action === "trigger") {
      const token = await getSetting("github_token");
      if (!token) return NextResponse.json({ error: "GitHub token not configured — add it in the token field below." }, { status: 400 });

      const ref = body.ref ?? "main";
      const res = await fetch(
        `https://api.github.com/repos/${REPO}/actions/workflows/${WORKFLOW}/dispatches`,
        {
          method: "POST",
          headers: {
            Authorization:  `Bearer ${token}`,
            Accept:         "application/vnd.github+json",
            "Content-Type": "application/json",
            "X-GitHub-Api-Version": "2022-11-28",
          },
          body: JSON.stringify({ ref, inputs: { triggered_by: "admin" } }),
        }
      );

      if (!res.ok) {
        const text = await res.text().catch(() => res.statusText);
        // Common: 404 when token lacks repo scope, 422 when branch doesn't exist
        if (res.status === 401 || res.status === 403) {
          return NextResponse.json({ error: "GitHub token is invalid or lacks Actions write permission." }, { status: 400 });
        }
        if (res.status === 404) {
          return NextResponse.json({ error: "Workflow not found — make sure the GitHub token has repo access." }, { status: 400 });
        }
        return NextResponse.json({ error: `GitHub API error ${res.status}: ${text.slice(0, 200)}` }, { status: 400 });
      }

      // 204 No Content = success
      return NextResponse.json({ success: true });
    }

    if (body.action === "get_run") {
      const { runId } = body as { runId?: string } & typeof body;
      if (!runId) return NextResponse.json({ error: "runId required" }, { status: 400 });
      const run = await db.generationRun.findUnique({
        where: { id: runId },
        include: { tasks: { orderBy: { createdAt: "asc" } } },
      });
      return NextResponse.json({ run });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
