import { NextResponse } from "next/server";
import { db, ensureSchema } from "../../../../lib/db";

export async function GET() {
  try {
    await ensureSchema();

    const [total, bySection, byDifficulty, recent] = await Promise.all([
      db.question.count(),
      db.question.groupBy({ by: ["section"], _count: { _all: true } }),
      db.question.groupBy({ by: ["difficulty"], _count: { _all: true } }),
      db.question.findMany({
        orderBy: { createdAt: "desc" },
        take: 30,
        select: {
          id: true,
          section: true,
          topic: true,
          stem: true,
          difficulty: true,
          correctAnswer: true,
          createdAt: true,
        },
      }),
    ]);

    const sectionMap: Record<string, number> = {};
    for (const r of bySection) sectionMap[r.section] = r._count._all;

    const difficultyMap: Record<string, number> = {};
    for (const r of byDifficulty) difficultyMap[r.difficulty] = r._count._all;

    return NextResponse.json({
      total,
      bySection: {
        "Chem/Phys":   sectionMap["Chem/Phys"]   ?? 0,
        "CARS":        sectionMap["CARS"]         ?? 0,
        "Bio/Biochem": sectionMap["Bio/Biochem"]  ?? 0,
        "Psych/Soc":   sectionMap["Psych/Soc"]    ?? 0,
      },
      byDifficulty: {
        easy:   difficultyMap["easy"]   ?? 0,
        medium: difficultyMap["medium"] ?? 0,
        hard:   difficultyMap["hard"]   ?? 0,
      },
      recent,
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
