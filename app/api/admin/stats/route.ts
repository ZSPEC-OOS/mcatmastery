import { NextResponse } from "next/server";
import { getQuestions } from "../../../../lib/firestore";

export async function GET() {
  try {
    const all = await getQuestions();

    const bySection: Record<string, number> = {};
    const byDifficulty: Record<string, number> = {};
    for (const q of all) {
      bySection[q.section]       = (bySection[q.section]       ?? 0) + 1;
      byDifficulty[q.difficulty] = (byDifficulty[q.difficulty] ?? 0) + 1;
    }

    return NextResponse.json({
      total: all.length,
      bySection: {
        "Chem/Phys":   bySection["Chem/Phys"]   ?? 0,
        "CARS":        bySection["CARS"]         ?? 0,
        "Bio/Biochem": bySection["Bio/Biochem"]  ?? 0,
        "Psych/Soc":   bySection["Psych/Soc"]   ?? 0,
      },
      byDifficulty: {
        easy:   byDifficulty["easy"]   ?? 0,
        medium: byDifficulty["medium"] ?? 0,
        hard:   byDifficulty["hard"]   ?? 0,
      },
      recent: all.slice(0, 30),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
