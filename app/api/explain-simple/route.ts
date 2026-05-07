import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { callModel } from "../../../lib/model";

const Schema = z.object({
  stem:          z.string(),
  optionA:       z.string(),
  optionB:       z.string(),
  optionC:       z.string(),
  optionD:       z.string(),
  correctAnswer: z.enum(["A", "B", "C", "D"]),
  explanation:   z.string(),
  passage:       z.string().nullable().optional(),
});

const SYSTEM = `You are a friendly MCAT tutor. A student just got a question wrong or found the explanation confusing. Rewrite the explanation in the simplest possible terms.

Rules:
- Start with the core concept in one plain sentence ("The key idea here is…")
- Use a real-world analogy or familiar example if it helps
- Explain why the correct answer is right in 2–3 sentences max
- Briefly say why the most tempting wrong answer is wrong
- Avoid jargon — if you must use a technical term, define it immediately
- Total length: 4–6 sentences, no bullet points, conversational tone`;

export async function POST(req: NextRequest) {
  try {
    const body = Schema.parse(await req.json());

    const userContent = [
      body.passage ? `Passage context: ${body.passage.slice(0, 600)}` : null,
      `Question: ${body.stem}`,
      `A. ${body.optionA}`,
      `B. ${body.optionB}`,
      `C. ${body.optionC}`,
      `D. ${body.optionD}`,
      `Correct answer: ${body.correctAnswer}`,
      `Original explanation: ${body.explanation}`,
    ].filter(Boolean).join("\n\n");

    const raw = await callModel({ system: SYSTEM, userContent, maxTokens: 400 });

    return NextResponse.json({ simpleExplanation: raw.trim() });
  } catch (err) {
    if (err instanceof z.ZodError)
      return NextResponse.json({ error: err.issues }, { status: 400 });
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
