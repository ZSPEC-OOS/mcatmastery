import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "../../../../lib/auth";
import { db } from "../../../../lib/db";

const UpdateSchema = z.object({
  userAnswer: z.enum(["A", "B", "C", "D"]).optional(),
  isCorrect: z.boolean().optional(),
  errorType: z.enum(["Content Gap", "Logic Error", "Misread Question", "Timing"]).optional(),
  flagged: z.boolean().optional(),
  confidence: z.enum(["low", "medium", "high"]).optional(),
  reviewStatus: z.enum(["pending", "reviewed"]).optional(),
});

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireUser();
    const { id } = await params;
    const question = await db.question.findUnique({ where: { id } });
    if (!question) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(question);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const body = UpdateSchema.parse(await req.json());

    // Updates are stored on the SessionQuestion, find the latest one for this user
    const sq = await db.sessionQuestion.findFirst({
      where: { questionId: id, session: { userId: user.id } },
      orderBy: { answeredAt: "desc" },
    });
    if (!sq) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const updated = await db.sessionQuestion.update({
      where: { id: sq.id },
      data: { ...body, answeredAt: body.userAnswer ? new Date() : undefined },
    });
    return NextResponse.json(updated);
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.issues }, { status: 400 });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
