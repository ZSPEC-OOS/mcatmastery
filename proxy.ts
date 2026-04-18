import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextFetchEvent, NextRequest, NextResponse } from "next/server";

const isPublic = createRouteMatcher(["/sign-in(.*)", "/sign-up(.*)"]);

const hasClerkSecret = Boolean(process.env.CLERK_SECRET_KEY);

const withClerk = clerkMiddleware(async (auth, req) => {
  if (!isPublic(req)) await auth.protect();
});

export default function proxy(req: NextRequest, event: NextFetchEvent) {
  if (!hasClerkSecret) {
    return NextResponse.next();
  }

  return withClerk(req, event);
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
