import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "../../../lib/auth";
import { db } from "../../../lib/db";

const NoteSchema = z.object({
  content: z.string().min(1),
  questionId: z.string().optional(),
  topic: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = NoteSchema.parse(await req.json());

    const note = await db.userNote.create({
      data: { userId: user.id, ...body },
    });

    return NextResponse.json(note, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.issues }, { status: 400 });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function GET() {
  try {
    const user = await requireUser();
    const notes = await db.userNote.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: "desc" },
    });
    return NextResponse.json(notes);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
