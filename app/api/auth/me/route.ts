import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db, ensureSchema } from "../../../../lib/db";

type UserPinRow = { firstName: string; lastName: string; email: string };

export async function GET() {
  try {
    const cookieStore = await cookies();
    const uid = cookieStore.get("pin_uid")?.value;
    if (!uid) return NextResponse.json({ user: null });

    await ensureSchema();
    const rows = await db.$queryRaw<UserPinRow[]>`
      SELECT "firstName", "lastName", "email"
      FROM "UserPin"
      WHERE "userId" = ${uid}
      LIMIT 1
    `;

    return NextResponse.json({ user: rows[0] ?? null });
  } catch {
    return NextResponse.json({ user: null });
  }
}
