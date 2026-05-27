import { NextResponse } from "next/server";
import { requireUser } from "../../../../lib/auth";
import { patchSessionAnswer, getQuestionById } from "../../../../lib/firestore";
import { z } from "zod";

const PatchSchema = z.object({
  userAnswer:   z.enum(["A", "B", "C", "D"]).optional(),
  isCorrect:    z.boolean().optional(),
  errorType:    z.enum(["Content Gap", "Logic Error", "Misread Question", "Timing"]).nullable().optional(),
  flagged:      z.boolean().optional(),
  confidence:   z.enum(["low", "medium", "high"]).nullable().optional(),
  reviewStatus: z.enum(["pending", "reviewed"]).optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireUser();
    const { id } = await params;
    const body = PatchSchema.parse(await req.json());

    // id format: sessionId_questionId (both are Firestore auto-IDs with no underscores)
    const sep = id.indexOf("_");
    if (sep === -1) return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    const sessionId  = id.slice(0, sep);
    const questionId = id.slice(sep + 1);

    const [updated, questionDoc] = await Promise.all([
      patchSessionAnswer(sessionId, questionId, {
        ...(body.errorType    !== undefined ? { errorType:    body.errorType    ?? undefined } : {}),
        ...(body.flagged      !== undefined ? { flagged:      body.flagged      } : {}),
        ...(body.confidence   !== undefined ? { confidence:   body.confidence   ?? undefined } : {}),
        ...(body.reviewStatus !== undefined ? { reviewStatus: body.reviewStatus } : {}),
      }),
      getQuestionById(questionId).catch(() => null),
    ]);

    return NextResponse.json({
      id,
      sessionId,
      questionId,
      userAnswer:   updated.userAnswer  ?? null,
      isCorrect:    updated.isCorrect,
      errorType:    updated.errorType   ?? null,
      flagged:      updated.flagged,
      confidence:   updated.confidence  ?? null,
      reviewStatus: updated.reviewStatus,
      answeredAt:   updated.answeredAt  ?? null,
      question:     questionDoc ?? { section: updated.questionSection ?? "", topic: updated.questionTopic ?? "" },
    });
  } catch (e) {
    if (e instanceof z.ZodError)
      return NextResponse.json({ error: e.issues }, { status: 400 });
    const msg = e instanceof Error ? e.message : "Failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
