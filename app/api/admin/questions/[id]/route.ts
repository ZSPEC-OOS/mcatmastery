import { NextRequest, NextResponse } from "next/server";
import { db, ensureSchema } from "../../../../../lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureSchema();
    const { id } = await params;
    const question = await db.question.findUnique({ where: { id } });
    if (!question) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ question });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Remove all session question references first (FK constraint)
    await db.sessionQuestion.deleteMany({ where: { questionId: id } });
    await db.question.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
