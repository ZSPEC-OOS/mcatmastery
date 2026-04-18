import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "../../../lib/auth";
import { db } from "../../../lib/db";

const QuerySchema = z.object({
  section: z.string().optional(),
  topic: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  cursor: z.string().optional(),
});

export async function GET(req: NextRequest) {
  try {
    await requireUser();
    const { section, topic, limit, cursor } = QuerySchema.parse(
      Object.fromEntries(req.nextUrl.searchParams)
    );

    const questions = await db.question.findMany({
      where: {
        ...(section ? { section } : {}),
        ...(topic ? { topic: { contains: topic, mode: "insensitive" } } : {}),
      },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: { createdAt: "desc" },
    });

    const hasMore = questions.length > limit;
    return NextResponse.json({
      questions: hasMore ? questions.slice(0, limit) : questions,
      nextCursor: hasMore ? questions[limit - 1].id : null,
    });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.issues }, { status: 400 });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
