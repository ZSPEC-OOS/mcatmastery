import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getQuestionById } from "../../../../lib/firestore";
import { callModel, getModelForRole } from "../../../../lib/model";

const Schema = z.object({ questionId: z.string().min(1) });

const FORMAT_SYSTEM = `You are an MCAT explanation formatter. Add markdown formatting to the given explanation to help students understand it more clearly.

Formatting rules:
- **bold** — key terms, the name of the correct mechanism, answer-critical concepts
- *italics* — scientific names, supporting details, secondary concepts
- ==highlight== — the single most critical insight (the core reason the answer is correct); use sparingly, at most once or twice
- __underline__ — a term or phrase students commonly confuse or miss
- Numbered lists (1. 2. 3.) — sequential steps in a process or pathway
- Bullet points (- ) — parallel comparisons or lists of related items

Strict rules:
- Preserve every word of the original — only add markup, never rewrite, rephrase, or remove anything
- Do not over-format; bold/highlight only the 2–4 most important elements
- Return ONLY the formatted explanation text — no JSON, no preamble, no commentary`;

export async function POST(req: NextRequest) {
  try {
    const { questionId } = Schema.parse(await req.json());

    const q = await getQuestionById(questionId);
    if (!q) return NextResponse.json({ error: "Question not found" }, { status: 404 });

    const formatModel = await getModelForRole("audit"); // reuse audit model role
    const modelOpts = formatModel
      ? { modelId: formatModel.modelId, baseUrl: formatModel.baseUrl || undefined, apiKey: formatModel.apiKey || undefined }
      : {};

    const formatted = await callModel({
      ...modelOpts,
      system: FORMAT_SYSTEM,
      userContent: q.explanation,
      maxTokens: 1200,
    });

    return NextResponse.json({ formattedExplanation: formatted.trim() });
  } catch (err) {
    if (err instanceof z.ZodError)
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    return NextResponse.json({ error: err instanceof Error ? err.message : "Format failed" }, { status: 500 });
  }
}
