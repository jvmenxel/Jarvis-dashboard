import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { neonConfig } from "@neondatabase/serverless";
import ws from "ws";

// Neon serverless driver. Works identically for:
//  - Neon (https://neon.tech)
//  - Vercel Postgres (Neon under the hood)
// and runs in both Node + Vercel serverless functions via HTTP. We also wire
// a WebSocket constructor so long-lived queries (e.g. migrations) work when
// run from a plain Node script.
if (typeof WebSocket === "undefined") {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  neonConfig.webSocketConstructor = ws as any;
}

const globalForPrisma = globalThis as unknown as {
  prismaLazy?: PrismaClient;
};

function makeClient() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  return new PrismaClient({
    adapter: new PrismaNeon({ connectionString: url }),
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

// Lazy singleton via Proxy: we don't touch DATABASE_URL until the first time
// someone actually uses a model. This lets `next build` collect page data
// without a live DB, and the singleton survives Next.js HMR in dev.
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    if (!globalForPrisma.prismaLazy) {
      globalForPrisma.prismaLazy = makeClient();
    }
    const value = Reflect.get(globalForPrisma.prismaLazy, prop, receiver);
    return typeof value === "function"
      ? value.bind(globalForPrisma.prismaLazy)
      : value;
  },
});
