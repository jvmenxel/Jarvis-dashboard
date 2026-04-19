import { clerkEnabled } from "@/lib/auth";
import Link from "next/link";

export default async function Page() {
  if (!clerkEnabled) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="max-w-md text-center space-y-4">
          <h1 className="text-2xl font-semibold">Dev mode</h1>
          <p className="text-fg-muted">
            Clerk is not configured yet — the app is running with a local
            fallback user. Add <code className="text-accent">CLERK_SECRET_KEY</code> and{" "}
            <code className="text-accent">NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY</code> to{" "}
            <code>.env</code> to enable real sign-in.
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
  const { SignIn } = await import("@clerk/nextjs");
  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <SignIn />
    </div>
  );
}
