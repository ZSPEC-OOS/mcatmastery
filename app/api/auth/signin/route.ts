import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { z } from "zod";
import { db, ensureSchema } from "../../../../lib/db";
import { saveUser, getUserByPinHash } from "../../../../lib/firestore";

const Schema = z.object({
  pin: z.string().min(4).max(6).regex(/^\d+$/, "PIN must be digits only"),
});

function hashPin(pin: string) {
  return createHash("sha256").update(pin).digest("hex");
}

type UserPinRow = { userId: string; firstName: string; lastName: string; email: string };

export async function POST(req: NextRequest) {
  try {
    const { pin } = Schema.parse(await req.json());
    const pinHash = hashPin(pin);

    let userId: string, firstName: string, lastName: string, email: string;

    try {
      await ensureSchema();
      const rows = await db.$queryRaw<UserPinRow[]>`
        SELECT "userId", "firstName", "lastName", "email"
        FROM "UserPin"
        WHERE "pinHash" = ${pinHash}
        LIMIT 1
      `;
      if (rows.length) {
        ({ userId, firstName, lastName, email } = rows[0]);
      } else {
        // Postgres is up but found no match — wrong PIN (not a DB outage), reject immediately
        return NextResponse.json({ error: "Incorrect PIN. Try again." }, { status: 401 });
      }
    } catch {
      // Postgres unavailable — fall back to Firestore so users can still sign in
      const fsUser = await getUserByPinHash(pinHash).catch(() => null);
      if (!fsUser) return NextResponse.json({ error: "Incorrect PIN. Try again." }, { status: 401 });
      ({ userId, firstName, lastName, email } = fsUser);
    }

    const user = { firstName, lastName, email };

    // Refresh Firestore copy but omit createdAt so the original signup timestamp is preserved
    saveUser({ userId, firstName, lastName, email, pinHash }).catch(() => {});

    const res = NextResponse.json({ ok: true, user });
    res.cookies.set("pin_uid", userId, { path: "/", sameSite: "lax", httpOnly: true, maxAge: 60 * 60 * 24 * 365 * 10 });
    return res;
  } catch (err) {
    if (err instanceof z.ZodError)
      return NextResponse.json({ error: err.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    return NextResponse.json({ error: "Sign in failed" }, { status: 500 });
  }
}
