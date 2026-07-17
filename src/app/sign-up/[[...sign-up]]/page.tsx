import { SignUp } from "@clerk/nextjs";
import { notFound } from "next/navigation";

import { isClerkEnabled } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default function SignUpPage() {
  if (!isClerkEnabled()) notFound();
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <SignUp />
    </div>
  );
}
