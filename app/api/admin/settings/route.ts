import { NextRequest, NextResponse } from "next/server";
import { getSettings, setSetting } from "../../../../lib/db";

const READABLE_KEYS = [
  "generation_prompt",
  "validation_prompt",
  "image_generation_prompt",
  "image_validation_prompt",
  "audit_prompt",
  "passage_generation_prompt",
  "automation_config",
  "github_token",
];

export async function GET() {
  try {
    const settings = await getSettings(READABLE_KEYS);
    return NextResponse.json({
      settings,
      env: {
        anthropic: !!process.env.ANTHROPIC_API_KEY,
        database: !!process.env.DATABASE_URL,
        clerkPublishable: !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
        clerkSecret: !!process.env.CLERK_SECRET_KEY,
        firebaseServiceAccount: !!process.env.FIREBASE_SERVICE_ACCOUNT,
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as Record<string, string>;
    for (const [key, value] of Object.entries(body)) {
      if (!READABLE_KEYS.includes(key)) continue;
      await setSetting(key, value);
    }
    return NextResponse.json({ success: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
