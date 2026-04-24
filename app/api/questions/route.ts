import { NextResponse } from "next/server";
import { requireUser } from "../../../lib/auth";
import { getSessionAnswers } from "../../../lib/firestore";

export async function GET(req: Request) {
  try {
    const user = await requireUser();
    const { searchParams } = new URL(req.url);
    const section  = searchParams.get("section") ?? undefined;
    const wrongOnly = searchParams.get("wrong") === "true";
    const limit    = Math.min(parseInt(searchParams.get("limit") || "50"), 200);

    let answers = await getSessionAnswers(user.id);

    if (wrongOnly) answers = answers.filter((a) => !a.isCorrect);
    if (section)   answers = answers.filter((a) => a.questionSection === section);

    const items = answers.slice(0, limit);
    const nextCursor = answers.length > limit ? answers[limit - 1].questionId : null;

    // Shape to match SessionQuestion format the review page expects
    const questions = items.map((a) => ({
      id:           `${a.sessionId}_${a.questionId}`,
      sessionId:    a.sessionId,
      questionId:   a.questionId,
      userAnswer:   a.userAnswer,
      isCorrect:    a.isCorrect,
      errorType:    a.errorType,
      flagged:      a.flagged,
      confidence:   a.confidence,
      reviewStatus: a.reviewStatus,
      answeredAt:   a.answeredAt,
      question: {
        section: a.questionSection ?? "",
        topic:   a.questionTopic   ?? "",
      },
    }));

    return NextResponse.json({ questions, nextCursor });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
