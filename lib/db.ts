import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

function createClient() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
  return new PrismaClient({ adapter });
}

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const db = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;

// ── Runtime schema bootstrap ──────────────────────────────────────────────────
// Creates all tables that don't exist yet. Runs once per process.
// This is a safety net for fresh databases where prisma db push hasn't run.

let _schemaEnsured = false;

export async function ensureSchema(): Promise<void> {
  if (_schemaEnsured) return;

  const stmts = [
    `CREATE TABLE IF NOT EXISTS "Question" (
      "id"            TEXT PRIMARY KEY,
      "section"       TEXT NOT NULL,
      "topic"         TEXT NOT NULL,
      "passage"       TEXT,
      "stem"          TEXT NOT NULL,
      "optionA"       TEXT NOT NULL,
      "optionB"       TEXT NOT NULL,
      "optionC"       TEXT NOT NULL,
      "optionD"       TEXT NOT NULL,
      "correctAnswer" TEXT NOT NULL,
      "explanation"   TEXT NOT NULL,
      "difficulty"    TEXT NOT NULL DEFAULT 'medium',
      "aiGenerated"   BOOLEAN NOT NULL DEFAULT TRUE,
      "figureUrl"     TEXT,
      "createdAt"     TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS "AppSetting" (
      "key"       TEXT PRIMARY KEY,
      "value"     TEXT NOT NULL,
      "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS "User" (
      "id"        TEXT PRIMARY KEY,
      "email"     TEXT UNIQUE NOT NULL,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS "PracticeSession" (
      "id"               TEXT PRIMARY KEY,
      "userId"           TEXT NOT NULL,
      "section"          TEXT NOT NULL,
      "startedAt"        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      "endedAt"          TIMESTAMPTZ,
      "timeLimitSeconds" INTEGER,
      FOREIGN KEY ("userId") REFERENCES "User"("id")
    )`,
    `CREATE TABLE IF NOT EXISTS "SessionQuestion" (
      "id"           TEXT PRIMARY KEY,
      "sessionId"    TEXT NOT NULL,
      "questionId"   TEXT NOT NULL,
      "userAnswer"   TEXT,
      "isCorrect"    BOOLEAN,
      "errorType"    TEXT,
      "flagged"      BOOLEAN NOT NULL DEFAULT FALSE,
      "confidence"   TEXT,
      "reviewStatus" TEXT NOT NULL DEFAULT 'pending',
      "answeredAt"   TIMESTAMPTZ,
      FOREIGN KEY ("sessionId")  REFERENCES "PracticeSession"("id"),
      FOREIGN KEY ("questionId") REFERENCES "Question"("id"),
      UNIQUE ("sessionId", "questionId")
    )`,
    `CREATE TABLE IF NOT EXISTS "FullLengthScore" (
      "id"         TEXT PRIMARY KEY,
      "userId"     TEXT NOT NULL,
      "testName"   TEXT NOT NULL,
      "chemPhys"   INTEGER NOT NULL,
      "cars"       INTEGER NOT NULL,
      "bioBiochem" INTEGER NOT NULL,
      "psychSoc"   INTEGER NOT NULL,
      "total"      INTEGER NOT NULL,
      "takenAt"    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      FOREIGN KEY ("userId") REFERENCES "User"("id")
    )`,
    `CREATE TABLE IF NOT EXISTS "UserNote" (
      "id"         TEXT PRIMARY KEY,
      "userId"     TEXT NOT NULL,
      "questionId" TEXT,
      "topic"      TEXT,
      "content"    TEXT NOT NULL,
      "createdAt"  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      "updatedAt"  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      FOREIGN KEY ("userId") REFERENCES "User"("id")
    )`,
    `CREATE TABLE IF NOT EXISTS "StudyTask" (
      "id"        TEXT PRIMARY KEY,
      "userId"    TEXT NOT NULL,
      "title"     TEXT NOT NULL,
      "section"   TEXT,
      "dueDate"   TIMESTAMPTZ,
      "completed" BOOLEAN NOT NULL DEFAULT FALSE,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      FOREIGN KEY ("userId") REFERENCES "User"("id")
    )`,
    // Add figureUrl to Question if it was created before this column existed
    `ALTER TABLE "Question" ADD COLUMN IF NOT EXISTS "figureUrl" TEXT`,
    `CREATE TABLE IF NOT EXISTS "GenerationRun" (
      "id"             TEXT PRIMARY KEY,
      "triggeredBy"    TEXT NOT NULL DEFAULT 'scheduler',
      "status"         TEXT NOT NULL DEFAULT 'running',
      "configSnapshot" TEXT NOT NULL DEFAULT '{}',
      "startedAt"      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      "completedAt"    TIMESTAMPTZ,
      "totalAttempted" INTEGER NOT NULL DEFAULT 0,
      "totalSaved"     INTEGER NOT NULL DEFAULT 0,
      "totalSkipped"   INTEGER NOT NULL DEFAULT 0,
      "totalErrors"    INTEGER NOT NULL DEFAULT 0,
      "errorMessage"   TEXT,
      "report"         TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS "GenerationTask" (
      "id"              TEXT PRIMARY KEY,
      "runId"           TEXT NOT NULL,
      "section"         TEXT NOT NULL,
      "topic"           TEXT NOT NULL,
      "subTypeId"       TEXT NOT NULL,
      "subTypeLabel"    TEXT NOT NULL DEFAULT '',
      "difficulty"      TEXT NOT NULL,
      "passageBased"    BOOLEAN NOT NULL DEFAULT FALSE,
      "status"          TEXT NOT NULL DEFAULT 'pending',
      "skipReason"      TEXT,
      "errorMessage"    TEXT,
      "savedQuestionId" TEXT,
      "createdAt"       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      "updatedAt"       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      FOREIGN KEY ("runId") REFERENCES "GenerationRun"("id")
    )`,
    `CREATE INDEX IF NOT EXISTS "GenerationTask_runId_status_idx" ON "GenerationTask"("runId", "status")`,
    // UserPin: persistent PIN-based user accounts (no Clerk dependency)
    `CREATE TABLE IF NOT EXISTS "UserPin" (
      "pinHash"   TEXT PRIMARY KEY,
      "userId"    TEXT UNIQUE NOT NULL,
      "firstName" TEXT NOT NULL,
      "lastName"  TEXT NOT NULL,
      "email"     TEXT UNIQUE NOT NULL,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
    )`,
  ];

  for (const sql of stmts) {
    await db.$executeRawUnsafe(sql).catch((err: unknown) => {
      console.error("[ensureSchema] statement failed:", err instanceof Error ? err.message : err);
    });
  }

  _schemaEnsured = true;
}

// ── AppSetting helpers ────────────────────────────────────────────────────────

/** Read a setting, returning null if missing. */
export async function getSetting(key: string): Promise<string | null> {
  try {
    await ensureSchema();
    const row = await db.appSetting.findUnique({ where: { key } });
    return row?.value ?? null;
  } catch {
    return null;
  }
}

/** Write a setting. */
export async function setSetting(key: string, value: string): Promise<void> {
  await ensureSchema();
  await db.appSetting.upsert({ where: { key }, update: { value }, create: { key, value } });
}

/** Read multiple settings as a map. */
export async function getSettings(keys: string[]): Promise<Record<string, string>> {
  try {
    await ensureSchema();
    const rows = await db.appSetting.findMany({ where: { key: { in: keys } } });
    return Object.fromEntries(rows.map((r) => [r.key, r.value]));
  } catch {
    return {};
  }
}
