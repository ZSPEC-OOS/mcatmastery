import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db, ensureSchema } from "../../../../lib/db";
import { getUserById } from "../../../../lib/firestore";

type UserPinRow = { firstName: string; lastName: string; email: string };

export async function GET() {
  const cookieStore = await cookies();
  const uid = cookieStore.get("pin_uid")?.value;
  if (!uid) return NextResponse.json({ user: null });

  // Try Postgres first
  try {
    await ensureSchema();
    const rows = await db.$queryRaw<UserPinRow[]>`
      SELECT "firstName", "lastName", "email"
      FROM "UserPin"
      WHERE "userId" = ${uid}
      LIMIT 1
    `;
    // Postgres is up — its answer is authoritative (empty = deleted user, do not bypass)
    return NextResponse.json({ user: rows[0] ?? null });
  } catch {
    // Postgres unavailable — fall back to Firestore
  }

  try {
    const fsUser = await getUserById(uid);
    if (fsUser) return NextResponse.json({ user: { firstName: fsUser.firstName, lastName: fsUser.lastName, email: fsUser.email } });
  } catch { /* Firestore also unavailable */ }

  return NextResponse.json({ user: null });
}
