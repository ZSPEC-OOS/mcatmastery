import { NextResponse } from "next/server";
import { requireUser } from "../../../lib/auth";
import { getSessionAnswers } from "../../../lib/firestore";
import { db } from "../../../lib/db";

const ALL_SECTIONS = ["Chem/Phys", "CARS", "Bio/Biochem", "Psych/Soc"] as const;

export async function GET() {
  try {
    const user    = await requireUser();
    const answers = await getSessionAnswers(user.id);
    const answered = answers.filter((a) => a.isCorrect !== null && a.isCorrect !== undefined);

    const total   = answered.length;
    const correct = answered.filter((a) => a.isCorrect).length;
    const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;

    const sectionMap: Record<string, { correct: number; total: number }> = {};
    const errorMap:   Record<string, number> = {};
    const topicMap:   Record<string, { correct: number; total: number }> = {};

    for (const a of answered) {
      const sec = a.questionSection ?? "Unknown";
      if (!sectionMap[sec]) sectionMap[sec] = { correct: 0, total: 0 };
      sectionMap[sec].total++;
      if (a.isCorrect) sectionMap[sec].correct++;

      if (!a.isCorrect && a.errorType) {
        errorMap[a.errorType] = (errorMap[a.errorType] ?? 0) + 1;
      }

      const key = `${sec}:${a.questionTopic ?? ""}`;
      if (!topicMap[key]) topicMap[key] = { correct: 0, total: 0 };
      topicMap[key].total++;
      if (a.isCorrect) topicMap[key].correct++;
    }

    const weakTopics = Object.entries(topicMap)
      .filter(([, v]) => v.total >= 3 && v.correct / v.total < 0.6)
      .map(([key, v]) => ({
        label:    key.split(":")[1],
        section:  key.split(":")[0],
        accuracy: Math.round((v.correct / v.total) * 100),
      }))
      .slice(0, 5);

    // Always include all four sections so the UI never drops a card
    const sections = Object.fromEntries(
      ALL_SECTIONS.map((s) => [s, sectionMap[s] ?? { correct: 0, total: 0 }])
    );

    // Fetch FL scores from Prisma (best-effort — gracefully empty if DB unavailable)
    let flScores: Array<{
      id: string; testName: string; chemPhys: number; cars: number;
      bioBiochem: number; psychSoc: number; total: number; takenAt: string;
    }> = [];
    try {
      const rows = await db.fullLengthScore.findMany({
        where:   { userId: user.id },
        orderBy: { takenAt: "asc" },
      });
      flScores = rows.map((r) => ({
        id:         r.id,
        testName:   r.testName,
        chemPhys:   r.chemPhys,
        cars:       r.cars,
        bioBiochem: r.bioBiochem,
        psychSoc:   r.psychSoc,
        total:      r.total,
        takenAt:    r.takenAt instanceof Date ? r.takenAt.toISOString() : String(r.takenAt),
      }));
    } catch { /* Prisma unavailable */ }

    return NextResponse.json({
      overall:    { accuracy, correct, total },
      sections,
      errorTypes: errorMap,
      weakTopics,
      flScores,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
