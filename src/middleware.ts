import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Phase 1: passthrough middleware.
 * Clerk protection is enabled in later phases once
 * NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY and CLERK_SECRET_KEY are configured.
 * Watchlist routes will call auth.protect() via clerkMiddleware then.
 */
export function middleware(_req: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
