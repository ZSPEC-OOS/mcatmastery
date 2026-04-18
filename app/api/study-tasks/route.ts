import { NextResponse } from "next/server";
import { requireUser } from "../../../lib/auth";
import { db } from "../../../lib/db";
import { z } from "zod";

const CreateSchema = z.object({
  title:   z.string().min(1),
  section: z.string().optional(),
  dueDate: z.string().datetime().optional(),
});

export async function GET() {
  try {
    const user = await requireUser();
    const tasks = await db.studyTask.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json(tasks);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const body = CreateSchema.parse(await req.json());
    const task = await db.studyTask.create({
      data: {
        userId: user.id, ...body,
        dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
      },
    });
    return NextResponse.json(task, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function PATCH(req: Request) {
  try {
    const user = await requireUser();
    const { id, completed } = z.object({ id: z.string(), completed: z.boolean() }).parse(await req.json());
    const task = await db.studyTask.findUnique({ where: { id }, select: { userId: true } });
    if (!task || task.userId !== user.id)
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    const updated = await db.studyTask.update({ where: { id }, data: { completed } });
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
