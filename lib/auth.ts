import { auth } from "@clerk/nextjs/server";
import { db } from "./db";

export async function requireUser() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  let user = await db.user.findUnique({ where: { id: userId } });
  if (!user) {
    const clerkUser = await import("@clerk/nextjs/server").then((m) =>
      m.clerkClient().users.getUser(userId)
    );
    user = await db.user.create({
      data: {
        id: userId,
        email: clerkUser.emailAddresses[0]?.emailAddress ?? "",
      },
    });
  }

  return user;
}
