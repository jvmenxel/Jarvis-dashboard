import { clerkEnabled } from "@/lib/auth";
import Link from "next/link";

export default async function Page() {
  if (!clerkEnabled) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="max-w-md text-center space-y-4">
          <h1 className="text-2xl font-semibold">Dev mode</h1>
          <p className="text-fg-muted">
            Clerk is not configured yet. Set up Clerk keys in <code>.env</code> to
            enable real sign-up.
          </p>
          <Link
            href="/dashboard"
            className="inline-block rounded-lg border border-border px-4 py-2 hover:bg-panel"
          >
            Open dashboard
          </Link>
        </div>
      </div>
    );
  }
  const { SignUp } = await import("@clerk/nextjs");
  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <SignUp />
    </div>
  );
}
