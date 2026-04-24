import { db, ensureSchema } from "./db";

export const GUEST_USER_ID = "guest";

/**
 * Returns the app's single guest user, creating it if needed.
 * Replaces Clerk-based auth — this app uses PIN-based login, not Clerk.
 */
export async function requireUser() {
  await ensureSchema();
  let user = await db.user.findUnique({ where: { id: GUEST_USER_ID } });
  if (!user) {
    user = await db.user.create({
      data: { id: GUEST_USER_ID, email: "guest@mcatmastery.app" },
    });
  }
  return user;
}
