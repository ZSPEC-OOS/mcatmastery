import { NextResponse } from "next/server";
import { requireUser } from "../../../lib/auth";
import { getSessionAnswers } from "../../../lib/firestore";

export async function GET() {
  try {
    const user    = await requireUser();
    const answers = await getSessionAnswers(user.id);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recent = answers.filter(
      (a) => a.answeredAt && new Date(a.answeredAt) >= sevenDaysAgo
    );
    const recentAcc = recent.length > 0
      ? Math.round((recent.filter((a) => a.isCorrect).length / recent.length) * 100)
      : null;

    const topicMap: Record<string, { correct: number; total: number }> = {};
    const sectionMap: Record<string, { correct: number; total: number }> = {};
    for (const a of answers) {
      const sec = a.questionSection ?? "Unknown";
      const key = `${sec}::${a.questionTopic ?? ""}`;
      if (!topicMap[key]) topicMap[key] = { correct: 0, total: 0 };
      topicMap[key].total++;
      if (a.isCorrect) topicMap[key].correct++;

      if (!sectionMap[sec]) sectionMap[sec] = { correct: 0, total: 0 };
      sectionMap[sec].total++;
      if (a.isCorrect) sectionMap[sec].correct++;
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

    return NextResponse.json({
      lastFL:        null,
      recentAcc,
      weakTopics,
      sectionMap,
      studyTasks:    [],
      totalAnswered: answers.length,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
