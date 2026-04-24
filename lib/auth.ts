export const GUEST_USER_ID = "guest";

export function requireUser() {
  return Promise.resolve({ id: GUEST_USER_ID });
}
