import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { callModel } from "../../../../../lib/model";
import { CURRICULUM_SECTIONS } from "../../../../../lib/curriculum-sections";

const Schema = z.object({
  stem:          z.string(),
  section:       z.string(),
  originalTopic: z.string(),
});

export async function POST(req: NextRequest) {
  try {
    const { stem, section, originalTopic } = Schema.parse(await req.json());

    const secData = CURRICULUM_SECTIONS.find((s) => s.label === section);
    const topicList = secData
      ? secData.groups.flatMap((g) => g.topics)
      : CURRICULUM_SECTIONS.flatMap((s) => s.groups.flatMap((g) => g.topics));

    const raw = await callModel({
      system: `You are an MCAT curriculum expert. Given a question stem, its section, and a list of canonical MCAT topics, identify the single best matching topic from the list. Return ONLY the exact topic name from the list — no explanation, no punctuation, nothing else.`,
      userContent: [
        `Section: ${section}`,
        `Original (unrecognized) topic: ${originalTopic}`,
        `Question stem: ${stem}`,
        ``,
        `Canonical topic list:`,
        ...topicList.map((t) => `- ${t}`),
        ``,
        `Return the single best matching topic name from the list above.`,
      ].join("\n"),
      maxTokens: 64,
    });

    const suggestion = raw.trim().replace(/^[-•]\s*/, "").trim();
    const matched = topicList.find(
      (t) => t.toLowerCase() === suggestion.toLowerCase()
    ) ?? suggestion;

    return NextResponse.json({ suggestion: matched });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
