// GET  → today's briefing (null if none)
// POST → ingest raw text (manual paste)

import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ingestBriefing, todayKey, IngestInput, parseSections } from "@/lib/briefings";

export async function GET(req: Request) {
  const userId = await getCurrentUserId();
  const date = new URL(req.url).searchParams.get("date") ?? todayKey();
  const row = await prisma.briefing.findUnique({
    where: { userId_date: { userId, date } },
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
