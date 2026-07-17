import "server-only";

/**
 * Clerk is fully optional. When the publishable and secret keys are both
 * present the app enables real auth and per-user watchlists; otherwise it runs
 * exactly as before with the labeled demo watchlist. Nothing here throws when
 * Clerk is absent.
 */
export function isClerkEnabled(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
      process.env.CLERK_SECRET_KEY,
  );
}

export async function getCurrentUserId(): Promise<string | null> {
  if (!isClerkEnabled()) return null;
  try {
    const { auth } = await import("@clerk/nextjs/server");
    const { userId } = await auth();
    return userId ?? null;
  } catch {
    return null;
  }
}

export async function requireUserId(): Promise<
  { ok: true; userId: string } | { ok: false; error: string }
> {
  if (!isClerkEnabled()) {
    return { ok: false, error: "Authentication is not configured" };
  }
  const userId = await getCurrentUserId();
  if (!userId) return { ok: false, error: "Sign in required" };
  return { ok: true, userId };
}
