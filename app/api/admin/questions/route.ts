import { NextResponse } from "next/server";
import { deleteAllQuestions } from "../../../../lib/firestore";

export async function DELETE() {
  try {
    const deleted = await deleteAllQuestions();
    return NextResponse.json({ deleted });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}
