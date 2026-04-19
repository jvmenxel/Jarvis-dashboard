// POST → pull latest message from the configured Slack channel/DM and ingest
// it as today's briefing. Used by the "Refresh from Slack" button and by the
// Vercel Cron job.

import { NextResponse } from "next/server";
import { getCurrentUserId, getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { fetchLatestBriefing } from "@/lib/briefings/slack";
import { ingestBriefing } from "@/lib/briefings";

async function resolveUserIdForCron(req: Request): Promise<string | null> {
  // Vercel Cron fires with an `authorization: Bearer ${CRON_SECRET}` header.
  // When invoked by cron (no Clerk cookie), we run for the single "owner"
  // user — the first user created. For multi-tenant later this becomes a
  // loop over users.
  const cronSecret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization") ?? "";
  if (cronSecret && auth === `Bearer ${cronSecret}`) {
    const owner = await prisma.user.findFirst({ orderBy: { createdAt: "asc" } });
    return owner?.id ?? null;
  }
  try {
    return await getCurrentUserId();
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  const userId = await resolveUserIdForCron(req);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const fetched = await fetchLatestBriefing();
  if (!fetched.ok) {
    return NextResponse.json({ ok: false, reason: fetched.reason }, { status: 200 });
  }
  const { briefing, reused } = await ingestBriefing(userId, {
    raw: fetched.text,
    source: "slack",
    sourceRef: fetched.ts,
  });
  return NextResponse.json({ ok: true, reused, briefingId: briefing.id });
}

// GET is used by Vercel Cron (which only supports GET). When a cron bearer
// token matches, we pull the latest briefing. Otherwise it returns simple
// diagnostics for the dashboard.
export async function GET(req: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization") ?? "";
  const isCron = cronSecret && auth === `Bearer ${cronSecret}`;

  if (isCron) {
    const owner = await prisma.user.findFirst({ orderBy: { createdAt: "asc" } });
    if (!owner) return NextResponse.json({ ok: false, reason: "no_user" });
    const fetched = await fetchLatestBriefing();
    if (!fetched.ok) return NextResponse.json({ ok: false, reason: fetched.reason });
    const { briefing, reused } = await ingestBriefing(owner.id, {
      raw: fetched.text,
      source: "cron",
      sourceRef: fetched.ts,
    });
    return NextResponse.json({ ok: true, reused, briefingId: briefing.id });
  }

  const user = await getCurrentUser();
  return NextResponse.json({
    configured: Boolean(
      process.env.SLACK_USER_TOKEN && process.env.SLACK_BRIEFING_CHANNEL
    ),
    channel: process.env.SLACK_BRIEFING_CHANNEL ?? null,
    userId: user.id,
  });
}
