import { NextResponse } from "next/server";
import { requireUser } from "../../../lib/auth";
import { db } from "../../../lib/db";

export async function GET(req: Request) {
  try {
    const user = await requireUser();
    const { searchParams } = new URL(req.url);
    const section = searchParams.get("section");
    const wrongOnly = searchParams.get("wrong") === "true";
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 200);
    const cursor = searchParams.get("cursor") || undefined;

    const sessionQuestions = await db.sessionQuestion.findMany({
      where: {
        session: { userId: user.id },
        ...(wrongOnly ? { isCorrect: false } : {}),
        ...(section ? { question: { section } } : {}),
      },
      include: { question: true },
      orderBy: { answeredAt: "desc" },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    const hasMore = sessionQuestions.length > limit;
    const items = hasMore ? sessionQuestions.slice(0, limit) : sessionQuestions;
    const nextCursor = hasMore ? items[items.length - 1].id : null;

    return NextResponse.json({ questions: items, nextCursor });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
