import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

function createClient() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
  return new PrismaClient({ adapter });
}

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const db = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;

// ── Schema helpers ────────────────────────────────────────────────────────────

let _appSettingEnsured = false;
export async function ensureAppSettingTable() {
  if (_appSettingEnsured) return;
  await db.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "AppSetting" (
      "key"       TEXT PRIMARY KEY,
      "value"     TEXT NOT NULL,
      "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `).catch(() => {});
  _appSettingEnsured = true;
}

/** Read a setting, returning null if the table or key doesn't exist. */
export async function getSetting(key: string): Promise<string | null> {
  try {
    await ensureAppSettingTable();
    const row = await db.appSetting.findUnique({ where: { key } });
    return row?.value ?? null;
  } catch {
    return null;
  }
}

/** Write a setting, auto-creating the table if needed. */
export async function setSetting(key: string, value: string): Promise<void> {
  await ensureAppSettingTable();
  await db.appSetting.upsert({ where: { key }, update: { value }, create: { key, value } });
}

/** Read multiple settings as a map, returning empty map on failure. */
export async function getSettings(keys: string[]): Promise<Record<string, string>> {
  try {
    await ensureAppSettingTable();
    const rows = await db.appSetting.findMany({ where: { key: { in: keys } } });
    return Object.fromEntries(rows.map((r) => [r.key, r.value]));
  } catch {
    return {};
  }
}
