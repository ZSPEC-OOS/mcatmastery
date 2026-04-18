import { auth, clerkClient } from "@clerk/nextjs/server";
import { db } from "./db";

export async function requireUser() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  let user = await db.user.findUnique({ where: { id: userId } });
  if (!user) {
    const client = await clerkClient();
    const clerkUser = await client.users.getUser(userId);
    user = await db.user.create({
      data: {
        id: userId,
        email: clerkUser.emailAddresses[0]?.emailAddress ?? "",
      },
    });
  }

  return user;
}
