import { NextRequest, NextResponse } from "next/server";
import { getQuestions } from "../../../../lib/firestore";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const section = searchParams.get("section") ?? undefined;
  const topic   = searchParams.get("topic")   ?? undefined;

  try {
    const all = await getQuestions({ section });
    const questions = topic
      ? all.filter((q) => q.topic === topic)
      : all;
    return NextResponse.json({ questions });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
