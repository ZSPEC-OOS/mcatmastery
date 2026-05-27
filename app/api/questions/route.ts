import { NextResponse } from "next/server";
import { requireUser } from "../../../lib/auth";
import { getSessionAnswers, getQuestionById } from "../../../lib/firestore";

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
    const nextCursor = answers.length > limit ? answers[limit].questionId : null;

    // Enrich with full question docs from Firestore
    const uniqueQIds = [...new Set(items.map((a) => a.questionId))];
    const questionDocs = await Promise.all(uniqueQIds.map((id) => getQuestionById(id).catch(() => null)));
    const qMap = new Map(questionDocs.filter(Boolean).map((q) => [q!.id, q!]));

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
      question: qMap.get(a.questionId) ?? {
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
