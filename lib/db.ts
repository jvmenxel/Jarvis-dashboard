import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

// Prisma singleton — avoid exhausting connections during Next.js HMR.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function resolveDatabasePath() {
  const raw = process.env.DATABASE_URL ?? "file:./dev.db";
  return raw.startsWith("file:") ? raw.slice("file:".length) : raw;
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter: new PrismaBetterSqlite3({ url: resolveDatabasePath() }),
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
