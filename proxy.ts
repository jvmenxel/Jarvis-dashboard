// Edge middleware: protects every app route with Clerk when configured,
// falls back to pass-through in dev mode (no Clerk keys). Vercel's Edge
// runtime only accepts ESM, so we use static imports and gate on env at
// request time — not with `require()`.

import { NextResponse, type NextRequest } from "next/server";
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isPublic = createRouteMatcher([
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/health",
]);

const withClerk = clerkMiddleware(async (auth, req) => {
  if (!isPublic(req)) await auth.protect();
});

function clerkEnabled() {
  return Boolean(
    process.env.CLERK_SECRET_KEY && process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function middleware(req: NextRequest, ev: any) {
  if (!clerkEnabled()) return NextResponse.next();
  return withClerk(req, ev);
}

export const config = {
  matcher: [
    // Skip Next internals and static assets.
    "/((?!_next|.*\\..*).*)",
    "/(api|trpc)(.*)",
  ],
};
