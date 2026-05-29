import { NextResponse } from "next/server";
import { getQuestions } from "../../../lib/firestore";

export async function GET() {
  try {
    const questions = await getQuestions({});

    const topicMap: Record<string, {
      section: string;
      discrete: number;
      passageGroups: Set<string>;
      passageQs: number;
      foundational: number;
      easy: number;
      medium: number;
      hard: number;
    }> = {};

    for (const q of questions) {
      if (!topicMap[q.topic]) {
        topicMap[q.topic] = { section: q.section, discrete: 0, passageGroups: new Set(), passageQs: 0, foundational: 0, easy: 0, medium: 0, hard: 0 };
      }
      if (q.passageGroupId) {
        topicMap[q.topic].passageGroups.add(q.passageGroupId);
        topicMap[q.topic].passageQs++;
      } else {
        topicMap[q.topic].discrete++;
      }
      const diff = q.difficulty ?? "medium";
      if (diff === "foundational") topicMap[q.topic].foundational++;
      else if (diff === "easy") topicMap[q.topic].easy++;
      else if (diff === "hard") topicMap[q.topic].hard++;
      else topicMap[q.topic].medium++;
    }

    const topicCounts = Object.entries(topicMap).map(([topic, v]) => ({
      topic,
      section:      v.section,
      count:        v.discrete + v.passageQs,
      discrete:     v.discrete,
      sets:         v.passageGroups.size,
      passageQs:    v.passageQs,
      foundational: v.foundational,
      easy:         v.easy,
      medium:       v.medium,
      hard:         v.hard,
    }));

    return NextResponse.json({ topicCounts });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
