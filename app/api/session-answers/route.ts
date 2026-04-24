import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "../../../lib/auth";
import { saveSessionAnswer, getQuestionById } from "../../../lib/firestore";

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

    // Fetch question for denormalized section/topic on the answer doc
    const question = await getQuestionById(body.questionId).catch(() => null);

    await saveSessionAnswer({
      questionId:       body.questionId,
      sessionId:        body.sessionId,
      userId:           user.id,
      userAnswer:       body.userAnswer,
      isCorrect:        body.isCorrect,
      errorType:        null,
      flagged:          false,
      confidence:       null,
      reviewStatus:     "pending",
      answeredAt:       new Date().toISOString(),
      timeSpentSeconds: body.timeSpentSeconds,
      questionSection:  question?.section,
      questionTopic:    question?.topic,
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    if (e instanceof z.ZodError)
      return NextResponse.json({ error: e.issues }, { status: 400 });
    const msg = e instanceof Error ? e.message : "Failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
