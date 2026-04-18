import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "../../../lib/auth";
import { db } from "../../../lib/db";

const CreateSchema = z.object({
  section: z.enum(["Chem/Phys", "CARS", "Bio/Biochem", "Psych/Soc"]),
  timeLimitSeconds: z.number().optional(),
  questionIds: z.array(z.string()).min(1),
});

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = CreateSchema.parse(await req.json());

    const session = await db.practiceSession.create({
      data: {
        userId: user.id,
        section: body.section,
        timeLimitSeconds: body.timeLimitSeconds,
        questions: {
          create: body.questionIds.map((qId) => ({ questionId: qId })),
        },
      },
      include: { questions: true },
    });

    return NextResponse.json(session, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.issues }, { status: 400 });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function GET() {
  try {
    const user = await requireUser();
    const sessions = await db.practiceSession.findMany({
      where: { userId: user.id },
      include: {
        questions: {
          include: { question: { select: { section: true, topic: true } } },
        },
      },
      orderBy: { startedAt: "desc" },
      take: 20,
    });
    return NextResponse.json(sessions);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
