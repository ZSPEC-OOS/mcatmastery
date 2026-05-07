import { NextResponse } from "next/server";
import { getQuestions } from "../../../lib/firestore";

export async function GET() {
  try {
    const questions = await getQuestions({});

    const topicMap: Record<string, { count: number; section: string }> = {};
    for (const q of questions) {
      if (!topicMap[q.topic]) topicMap[q.topic] = { count: 0, section: q.section };
      topicMap[q.topic].count++;
    }

    const topicCounts = Object.entries(topicMap).map(([topic, v]) => ({
      topic,
      section: v.section,
      count:   v.count,
    }));

    return NextResponse.json({ topicCounts });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
