import { prisma } from "@/lib/db";

// Clerk is optional. When CLERK_SECRET_KEY is missing we run in "dev mode":
// a single local user is lazily created so the app is immediately usable.
export const clerkEnabled = Boolean(
  process.env.CLERK_SECRET_KEY && process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
);

const DEV_CLERK_ID = "dev-user";

type CurrentUser = {
  id: string;
  clerkId: string;
  email: string | null;
  name: string | null;
  isDev: boolean;
};

async function ensureUser(clerkId: string, email: string | null, name: string | null) {
  return prisma.user.upsert({
    where: { clerkId },
    update: {},
    create: { clerkId, email, name },
  });
}

// Returns the current user, creating the DB row on first touch. In dev mode
// (no Clerk keys) it returns a stable local fallback user so every feature is
// usable without any external service configured.
export async function getCurrentUser(): Promise<CurrentUser> {
  if (!clerkEnabled) {
    const user = await ensureUser(DEV_CLERK_ID, "dev@local", "Dev User");
    return { ...user, isDev: true };
  }

  // Dynamically import Clerk only when enabled — keeps the dev path zero-config.
  const { auth, currentUser } = await import("@clerk/nextjs/server");
  const { userId } = await auth();
  if (!userId) {
    throw new Error("UNAUTHENTICATED");
  }
  const cu = await currentUser();
  const email = cu?.emailAddresses?.[0]?.emailAddress ?? null;
  const name =
    [cu?.firstName, cu?.lastName].filter(Boolean).join(" ") || cu?.username || null;
  const user = await ensureUser(userId, email, name);
  return { ...user, isDev: false };
}

export async function getCurrentUserId(): Promise<string> {
  const u = await getCurrentUser();
  return u.id;
}
