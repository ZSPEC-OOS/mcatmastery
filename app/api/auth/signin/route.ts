import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { z } from "zod";
import { db, ensureSchema } from "../../../../lib/db";
import { saveUser } from "../../../../lib/firestore";

const Schema = z.object({
  pin: z.string().min(4).max(6).regex(/^\d+$/, "PIN must be digits only"),
});

function hashPin(pin: string) {
  return createHash("sha256").update(pin).digest("hex");
}

type UserPinRow = { userId: string; firstName: string; lastName: string; email: string };

export async function POST(req: NextRequest) {
  try {
    await ensureSchema();
    const { pin } = Schema.parse(await req.json());
    const pinHash = hashPin(pin);

    const rows = await db.$queryRaw<UserPinRow[]>`
      SELECT "userId", "firstName", "lastName", "email"
      FROM "UserPin"
      WHERE "pinHash" = ${pinHash}
      LIMIT 1
    `;

    if (!rows.length)
      return NextResponse.json({ error: "Incorrect PIN. Try again." }, { status: 401 });

    const { userId, firstName, lastName, email } = rows[0];
    const user = { firstName, lastName, email };

    // Keep Firestore copy fresh on every sign-in
    saveUser({ userId, firstName, lastName, email, createdAt: new Date().toISOString() }).catch(() => {});

    const res = NextResponse.json({ ok: true, user });
    res.cookies.set("pin_uid", userId, { path: "/", sameSite: "lax", httpOnly: true, maxAge: 60 * 60 * 24 * 365 * 10 });
    return res;
  } catch (err) {
    if (err instanceof z.ZodError)
      return NextResponse.json({ error: err.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    return NextResponse.json({ error: "Sign in failed" }, { status: 500 });
  }
}
