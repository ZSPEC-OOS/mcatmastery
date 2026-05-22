import { cookies } from "next/headers";

export const GUEST_USER_ID = "guest";

export async function requireUser(): Promise<{ id: string }> {
  try {
    const cookieStore = await cookies();
    const uid = cookieStore.get("pin_uid")?.value;
    if (uid) return { id: decodeURIComponent(uid) };
  } catch {
    // cookies() throws outside a request context (e.g. during build)
  }
  return { id: GUEST_USER_ID };
}
