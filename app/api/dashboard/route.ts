import { NextResponse } from "next/server";
import { requireUser } from "../../../lib/auth";
import { db } from "../../../lib/db";

export async function GET() {
  try {
    const user = await requireUser();

    const [sessionQuestions, flScores, studyTasks] = await Promise.all([
      db.sessionQuestion.findMany({
        where: { session: { userId: user.id }, answeredAt: { not: null } },
        include: { question: { select: { section: true, topic: true } } },
        orderBy: { answeredAt: "desc" },
        take: 500,
      }),
      db.fullLengthScore.findMany({
        where: { userId: user.id },
        orderBy: { takenAt: "desc" },
        take: 1,
      }),
      db.studyTask.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
    ]);

    const lastFL = flScores[0]?.total ?? null;

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recent = sessionQuestions.filter(
      sq => sq.answeredAt && new Date(sq.answeredAt) >= sevenDaysAgo
    );
    const recentAcc = recent.length > 0
      ? Math.round((recent.filter(sq => sq.isCorrect).length / recent.length) * 100)
      : null;

    const topicMap: Record<string, { correct: number; total: number }> = {};
    for (const sq of sessionQuestions) {
      const key = `${sq.question.section}::${sq.question.topic}`;
      if (!topicMap[key]) topicMap[key] = { correct: 0, total: 0 };
      topicMap[key].total++;
      if (sq.isCorrect) topicMap[key].correct++;
    }
    const weakTopics = Object.entries(topicMap)
      .filter(([, v]) => v.total >= 3 && v.correct / v.total < 0.6)
      .map(([key, v]) => ({
        topic:    key.split("::")[1],
        section:  key.split("::")[0],
        accuracy: Math.round((v.correct / v.total) * 100),
      }))
      .sort((a, b) => a.accuracy - b.accuracy)
      .slice(0, 4);

    const sectionMap: Record<string, { correct: number; total: number }> = {};
    for (const sq of sessionQuestions) {
      const sec = sq.question.section;
      if (!sectionMap[sec]) sectionMap[sec] = { correct: 0, total: 0 };
      sectionMap[sec].total++;
      if (sq.isCorrect) sectionMap[sec].correct++;
    }

    return NextResponse.json({
      lastFL, recentAcc, weakTopics, sectionMap, studyTasks,
      totalAnswered: sessionQuestions.length,
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
