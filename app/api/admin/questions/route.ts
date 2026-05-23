import { NextRequest, NextResponse } from "next/server";
import { deleteAllQuestions, getQuestions } from "../../../../lib/firestore";

export async function GET(req: NextRequest) {
  try {
    const auditedOnly = new URL(req.url).searchParams.get("auditedOnly") === "true";
    const questions = await getQuestions({ auditedOnly });
    return NextResponse.json({ questions });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const deleted = await deleteAllQuestions();
    return NextResponse.json({ deleted });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}
