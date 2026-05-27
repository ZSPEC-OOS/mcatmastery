import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db, ensureSchema } from "../../../../lib/db";
import { getUserById } from "../../../../lib/firestore";

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

    if (rows[0]) return NextResponse.json({ user: rows[0] });

    // Postgres returned nothing — try Firestore as the permanent backup
    const fsUser = await getUserById(uid).catch(() => null);
    if (fsUser) {
      return NextResponse.json({ user: { firstName: fsUser.firstName, lastName: fsUser.lastName, email: fsUser.email } });
    }

    return NextResponse.json({ user: null });
  } catch {
    return NextResponse.json({ user: null });
  }
}
