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
    }> = {};

    for (const q of questions) {
      if (!topicMap[q.topic]) {
        topicMap[q.topic] = { section: q.section, discrete: 0, passageGroups: new Set(), passageQs: 0 };
      }
      if (q.passageGroupId) {
        topicMap[q.topic].passageGroups.add(q.passageGroupId);
        topicMap[q.topic].passageQs++;
      } else {
        topicMap[q.topic].discrete++;
      }
    }

    const topicCounts = Object.entries(topicMap).map(([topic, v]) => ({
      topic,
      section:   v.section,
      count:     v.discrete + v.passageQs,
      discrete:  v.discrete,
      sets:      v.passageGroups.size,
      passageQs: v.passageQs,
    }));

    return NextResponse.json({ topicCounts });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
