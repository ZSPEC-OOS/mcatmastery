import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "../../../../../lib/auth";
import { db } from "../../../../../lib/db";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireUser();
    const { id } = await params;

    // Remove all session question references first (FK constraint)
    await db.sessionQuestion.deleteMany({ where: { questionId: id } });
    await db.question.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
