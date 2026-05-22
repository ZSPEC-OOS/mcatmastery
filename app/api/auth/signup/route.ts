import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { z } from "zod";
import { db, ensureSchema } from "../../../../lib/db";

const Schema = z.object({
  firstName: z.string().min(1).max(50),
  lastName:  z.string().min(1).max(50),
  email:     z.string().email(),
  pin:       z.string().min(4).max(6).regex(/^\d+$/, "PIN must be digits only"),
});

function hashPin(pin: string) {
  return createHash("sha256").update(pin).digest("hex");
}

type Row = { count: bigint };

export async function POST(req: NextRequest) {
  try {
    await ensureSchema();
    const { firstName, lastName, email, pin } = Schema.parse(await req.json());

    const userId  = email.toLowerCase().trim();
    const pinHash = hashPin(pin);

    const [pinRows, emailRows] = await Promise.all([
      db.$queryRaw<Row[]>`SELECT COUNT(*) AS count FROM "UserPin" WHERE "pinHash" = ${pinHash}`,
      db.$queryRaw<Row[]>`SELECT COUNT(*) AS count FROM "UserPin" WHERE "email"   = ${userId}`,
    ]);

    if (Number(pinRows[0]?.count) > 0)
      return NextResponse.json({ error: "That PIN is already taken — choose another." }, { status: 400 });
    if (Number(emailRows[0]?.count) > 0)
      return NextResponse.json({ error: "An account with that email already exists." }, { status: 400 });

    // Upsert User row (id = email) then create UserPin
    await db.$executeRaw`
      INSERT INTO "User" ("id", "email", "createdAt")
      VALUES (${userId}, ${userId}, NOW())
      ON CONFLICT ("id") DO NOTHING
    `;
    await db.$executeRaw`
      INSERT INTO "UserPin" ("pinHash", "userId", "firstName", "lastName", "email", "createdAt")
      VALUES (${pinHash}, ${userId}, ${firstName.trim()}, ${lastName.trim()}, ${userId}, NOW())
    `;

    const user = { firstName: firstName.trim(), lastName: lastName.trim(), email: userId };
    const res  = NextResponse.json({ ok: true, user });
    res.cookies.set("pin_uid", userId, { path: "/", sameSite: "lax", maxAge: 60 * 60 * 24 * 30 });
    return res;
  } catch (err) {
    if (err instanceof z.ZodError)
      return NextResponse.json({ error: err.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    return NextResponse.json({ error: err instanceof Error ? err.message : "Signup failed" }, { status: 500 });
  }
}
