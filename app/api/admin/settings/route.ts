import { NextRequest, NextResponse } from "next/server";
import { db } from "../../../../lib/db";

const READABLE_KEYS = [
  "generation_prompt",
  "validation_prompt",
  "firestore_project_id",
  "firestore_enabled",
];

export async function GET() {
  try {

    const rows = await db.appSetting.findMany({
      where: { key: { in: READABLE_KEYS } },
    });

    const settings: Record<string, string> = {};
    for (const row of rows) settings[row.key] = row.value;

    // Env-var status (never expose actual values)
    return NextResponse.json({
      settings,
      env: {
        anthropic: !!process.env.ANTHROPIC_API_KEY,
        database: !!process.env.DATABASE_URL,
        clerkPublishable: !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
        clerkSecret: !!process.env.CLERK_SECRET_KEY,
      },
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(req: NextRequest) {
  try {

    const body = await req.json() as Record<string, string>;

    for (const [key, value] of Object.entries(body)) {
      if (!READABLE_KEYS.includes(key)) continue;
      await db.appSetting.upsert({
        where: { key },
        update: { value },
        create: { key, value },
      });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
