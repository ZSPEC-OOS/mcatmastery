import { NextResponse } from "next/server";
import { requireUser } from "../../../lib/auth";
import { db } from "../../../lib/db";

export async function GET() {
  try {
    const user = await requireUser();

    const sessionQuestions = await db.sessionQuestion.findMany({
      where: { session: { userId: user.id }, answeredAt: { not: null } },
      include: { question: { select: { section: true, topic: true } } },
    });

    const topicMap: Record<string, { correct: number; total: number; section: string }> = {};
    for (const sq of sessionQuestions) {
      const key = sq.question.topic;
      if (!topicMap[key]) topicMap[key] = { correct: 0, total: 0, section: sq.question.section };
      topicMap[key].total++;
      if (sq.isCorrect) topicMap[key].correct++;
    }

    const topicAccuracy = Object.entries(topicMap).map(([topic, v]) => ({
      topic,
      section:  v.section,
      accuracy: Math.round((v.correct / v.total) * 100),
      attempted: v.total,
    }));

    return NextResponse.json({ topicAccuracy });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
