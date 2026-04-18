import { NextResponse } from "next/server";
import { requireUser } from "../../../lib/auth";

export async function GET() {
  try {
    const user = await requireUser();
    return NextResponse.json(user);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
