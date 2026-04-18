import { NextResponse } from "next/server";
import { requireUser } from "../../../lib/auth";
import { db } from "../../../lib/db";
import { z } from "zod";
import { syncSessionAnswerToFirestore } from "../../../lib/firestore";

const Schema = z.object({
  sessionId:        z.string(),
  questionId:       z.string(),
  userAnswer:       z.enum(["A", "B", "C", "D"]),
  isCorrect:        z.boolean(),
  timeSpentSeconds: z.number().int().optional(),
});

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const body = Schema.parse(await req.json());

    const session = await db.practiceSession.findUnique({
      where: { id: body.sessionId }, select: { userId: true },
    });
    if (!session || session.userId !== user.id)
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const sq = await db.sessionQuestion.upsert({
      where: { sessionId_questionId: { sessionId: body.sessionId, questionId: body.questionId } },
      create: {
        sessionId:  body.sessionId,
        questionId: body.questionId,
        userAnswer: body.userAnswer,
        isCorrect:  body.isCorrect,
        answeredAt: new Date(),
      },
      update: {
        userAnswer: body.userAnswer,
        isCorrect:  body.isCorrect,
        answeredAt: new Date(),
      },
    });
    // Fire-and-forget Firestore sync (non-blocking)
    syncSessionAnswerToFirestore({
      sessionId:        body.sessionId,
      questionId:       body.questionId,
      userId:           user.id,
      userAnswer:       body.userAnswer,
      isCorrect:        body.isCorrect,
      answeredAt:       sq.answeredAt ?? new Date(),
      timeSpentSeconds: body.timeSpentSeconds,
    }).catch(() => {});

    return NextResponse.json(sq);
  } catch (e) {
    if (e instanceof z.ZodError)
      return NextResponse.json({ error: e.issues }, { status: 400 });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
