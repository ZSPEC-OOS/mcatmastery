import { NextResponse } from "next/server";
import { requireUser } from "../../../lib/auth";
import { db } from "../../../lib/db";
import { z } from "zod";

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const { section, timeLimitSeconds } = z.object({
      section: z.string(),
      timeLimitSeconds: z.number().nullable().optional(),
    }).parse(await req.json());

    const session = await db.practiceSession.create({
      data: { userId: user.id, section, timeLimitSeconds },
    });
    return NextResponse.json(session, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function PATCH(req: Request) {
  try {
    const user = await requireUser();
    const { sessionId } = z.object({ sessionId: z.string() }).parse(await req.json());

    const session = await db.practiceSession.findUnique({
      where: { id: sessionId }, select: { userId: true },
    });
    if (!session || session.userId !== user.id)
      return NextResponse.json({ error: "Not found" }, { status: 404 });

    const updated = await db.practiceSession.update({
      where: { id: sessionId },
      data: { endedAt: new Date() },
    });
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function GET() {
  try {
    const user = await requireUser();
    const sessions = await db.practiceSession.findMany({
      where: { userId: user.id },
      include: {
        questions: {
          include: { question: { select: { section: true, topic: true } } },
        },
      },
      orderBy: { startedAt: "desc" },
      take: 20,
    });
    return NextResponse.json(sessions);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
