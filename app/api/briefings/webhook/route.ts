// Signed webhook — a Zapier/Cowork/n8n integration can POST a briefing here.
// Uses a shared secret in the `x-jarvis-secret` header (BRIEFING_WEBHOOK_SECRET).

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ingestBriefing, IngestInput } from "@/lib/briefings";
import { z } from "zod";

const Body = IngestInput.extend({
  userEmail: z.string().email().optional(), // optional hint for multi-tenant
});

export async function POST(req: Request) {
  const secret = process.env.BRIEFING_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "not_configured" }, { status: 503 });
  const provided = req.headers.get("x-jarvis-secret") ?? "";
  if (provided !== secret) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const input = Body.parse(await req.json());
  const user = input.userEmail
    ? await prisma.user.findFirst({ where: { email: input.userEmail } })
    : await prisma.user.findFirst({ orderBy: { createdAt: "asc" } });
  if (!user) return NextResponse.json({ error: "no_user" }, { status: 404 });

  const { briefing, reused } = await ingestBriefing(user.id, input);
  return NextResponse.json({ ok: true, reused, briefingId: briefing.id });
}
