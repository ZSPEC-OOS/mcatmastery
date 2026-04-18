import { NextResponse } from "next/server";
import { requireUser } from "../../../lib/auth";
import { db } from "../../../lib/db";

export async function GET() {
  try {
    const user = await requireUser();

    const [sessionQuestions, flScores] = await Promise.all([
      db.sessionQuestion.findMany({
        where: { session: { userId: user.id }, isCorrect: { not: null } },
        include: { question: { select: { section: true, topic: true } } },
        orderBy: { answeredAt: "desc" },
      }),
      db.fullLengthScore.findMany({
        where: { userId: user.id },
        orderBy: { takenAt: "asc" },
        take: 10,
      }),
    ]);

    const total = sessionQuestions.length;
    const correct = sessionQuestions.filter((q: (typeof sessionQuestions)[0]) => q.isCorrect).length;
    const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;

    const sectionMap: Record<string, { correct: number; total: number }> = {};
    for (const sq of sessionQuestions) {
      const sec = sq.question.section;
      if (!sectionMap[sec]) sectionMap[sec] = { correct: 0, total: 0 };
      sectionMap[sec].total++;
      if (sq.isCorrect) sectionMap[sec].correct++;
    }

    const errorMap: Record<string, number> = {};
    for (const sq of sessionQuestions.filter((q: (typeof sessionQuestions)[0]) => !q.isCorrect && q.errorType)) {
      errorMap[sq.errorType!] = (errorMap[sq.errorType!] ?? 0) + 1;
    }

    const topicMap: Record<string, { correct: number; total: number }> = {};
    for (const sq of sessionQuestions) {
      const key = `${sq.question.section}:${sq.question.topic}`;
      if (!topicMap[key]) topicMap[key] = { correct: 0, total: 0 };
      topicMap[key].total++;
      if (sq.isCorrect) topicMap[key].correct++;
    }

    const weakTopics = Object.entries(topicMap)
      .filter(([, v]) => v.total >= 3 && v.correct / v.total < 0.6)
      .map(([key, v]) => ({
        label: key.split(":")[1],
        section: key.split(":")[0],
        accuracy: Math.round((v.correct / v.total) * 100),
      }))
      .slice(0, 5);

    return NextResponse.json({
      overall: { accuracy, correct, total },
      sections: sectionMap,
      errorTypes: errorMap,
      weakTopics,
      flScores,
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
