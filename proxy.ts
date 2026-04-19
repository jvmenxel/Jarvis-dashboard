// Middleware: only mounts Clerk protection if Clerk keys are present. In dev
// mode the app is fully public (single fallback user) so you can try it
// without any external service configured.

import { NextResponse, type NextRequest } from "next/server";

const clerkEnabled = Boolean(
  process.env.CLERK_SECRET_KEY && process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
);

// Use any-typed dynamic handler so Clerk stays optional at build time.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let clerkHandler: any = null;
if (clerkEnabled) {
  // Top-level require so Next can statically analyse + tree-shake.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { clerkMiddleware, createRouteMatcher } = require("@clerk/nextjs/server");
  const isPublic = createRouteMatcher([
    "/sign-in(.*)",
    "/sign-up(.*)",
    "/api/health",
  ]);
  clerkHandler = clerkMiddleware(async (auth: any, req: any) => {
    if (!isPublic(req)) await auth.protect();
  });
}

export default function middleware(req: NextRequest) {
  if (clerkHandler) return clerkHandler(req);
  return NextResponse.next();
}

export const config = {
  matcher: [
    // Skip Next internals and static assets.
    "/((?!_next|.*\\..*).*)",
    "/(api|trpc)(.*)",
  ],
};
