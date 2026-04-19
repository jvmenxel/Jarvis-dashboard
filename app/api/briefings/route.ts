// GET  → today's briefing (null if none)
// POST → ingest raw text (manual paste)

import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ingestBriefing, IngestInput, parseSections } from "@/lib/briefings";

export async function GET(req: Request) {
  const userId = await getCurrentUserId();
  const dateParam = new URL(req.url).searchParams.get("date");
  // When a specific date is requested, fetch that one; otherwise return the
  // latest briefing (so a Monday-only feed stays visible all week).
  const row = dateParam
    ? await prisma.briefing.findUnique({
        where: { userId_date: { userId, date: dateParam } },
      })
    : await prisma.briefing.findFirst({
        where: { userId },
        orderBy: { date: "desc" },
      });
  return NextResponse.json({
    briefing: row
      ? { ...row, sections: parseSections(row.sections) }
      : null,
  });
}

export async function POST(req: Request) {
  const userId = await getCurrentUserId();
  const body = await req.json();
  const input = IngestInput.parse(body);
  const { briefing, reused } = await ingestBriefing(userId, input);
  return NextResponse.json(
    { briefing: { ...briefing, sections: parseSections(briefing.sections) }, reused },
    { status: 201 }
  );
}
