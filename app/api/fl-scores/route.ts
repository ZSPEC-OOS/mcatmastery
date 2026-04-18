import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "../../../lib/auth";
import { db } from "../../../lib/db";

const FLScoreSchema = z.object({
  testName: z.string().min(1),
  chemPhys: z.number().min(118).max(132),
  cars: z.number().min(118).max(132),
  bioBiochem: z.number().min(118).max(132),
  psychSoc: z.number().min(118).max(132),
  takenAt: z.string().datetime().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = FLScoreSchema.parse(await req.json());

    const score = await db.fullLengthScore.create({
      data: {
        userId: user.id,
        testName: body.testName,
        chemPhys: body.chemPhys,
        cars: body.cars,
        bioBiochem: body.bioBiochem,
        psychSoc: body.psychSoc,
        total: body.chemPhys + body.cars + body.bioBiochem + body.psychSoc,
        ...(body.takenAt ? { takenAt: new Date(body.takenAt) } : {}),
      },
    });

    return NextResponse.json(score, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.issues }, { status: 400 });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function GET() {
  try {
    const user = await requireUser();
    const scores = await db.fullLengthScore.findMany({
      where: { userId: user.id },
      orderBy: { takenAt: "asc" },
    });
    return NextResponse.json(scores);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
