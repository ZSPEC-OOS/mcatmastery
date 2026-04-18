import { NextResponse } from "next/server";
import { requireUser } from "../../../../lib/auth";
import { db } from "../../../../lib/db";
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
    const user = await requireUser();
    const { id } = await params;
    const body = PatchSchema.parse(await req.json());

    const sq = await db.sessionQuestion.findUnique({
      where: { id },
      include: { session: { select: { userId: true } } },
    });
    if (!sq || sq.session.userId !== user.id)
      return NextResponse.json({ error: "Not found" }, { status: 404 });

    const updated = await db.sessionQuestion.update({
      where: { id },
      data: {
        ...body,
        ...(body.userAnswer ? { answeredAt: new Date() } : {}),
      },
      include: { question: true },
    });

    return NextResponse.json(updated);
  } catch (e) {
    if (e instanceof z.ZodError)
      return NextResponse.json({ error: e.issues }, { status: 400 });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
