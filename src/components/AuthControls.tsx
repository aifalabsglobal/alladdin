"use client";

import {
  SignedIn,
  SignedOut,
  SignInButton,
  UserButton,
} from "@clerk/nextjs";

/**
 * Rendered only when Clerk is enabled (guarded by the parent). Shows a compact
 * sign-in control when signed out and the Clerk user button when signed in.
 */
export function AuthControls() {
  return (
    <div className="flex items-center">
      <SignedOut>
        <SignInButton mode="modal">
          <button
            type="button"
            className="rounded-xl border border-line bg-card px-3 py-1.5 text-xs font-semibold text-ink transition hover:border-positive/40"
          >
            Sign in
          </button>
        </SignInButton>
      </SignedOut>
      <SignedIn>
        <UserButton
          appearance={{ elements: { avatarBox: "h-7 w-7" } }}
        />
      </SignedIn>
    </div>
  );
}
