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
