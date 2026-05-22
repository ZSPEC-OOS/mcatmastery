import { NextResponse } from "next/server";
import { requireUser } from "../../../lib/auth";
import { deleteUserSessions } from "../../../lib/firestore";

export async function GET() {
  try {
    const user = await requireUser();
    return NextResponse.json(user);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function DELETE() {
  try {
    const user = await requireUser();
    await deleteUserSessions(user.id);
    return NextResponse.json({ success: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
