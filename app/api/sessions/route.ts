import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "../../../lib/auth";
import { createSession, completeSession } from "../../../lib/firestore";

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const { section, timeLimitSeconds } = z.object({
      section:          z.string(),
      timeLimitSeconds: z.number().nullable().optional(),
    }).parse(await req.json());

    const session = await createSession({
      userId:  user.id,
      section,
      timed:   !!timeLimitSeconds,
    });
    return NextResponse.json(session, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const { sessionId } = z.object({ sessionId: z.string() }).parse(await req.json());
    await completeSession(sessionId);
    return NextResponse.json({ success: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
