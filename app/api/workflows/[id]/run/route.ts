// Manual workflow runner. For MVP we simply record a run with a simulated
// success. Real step execution (HTTP calls, tool chaining, n8n handoff) goes
// behind this same API so the UI/feedback loop is already in place.

import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const userId = await getCurrentUserId();
  const { id } = await ctx.params;

  const workflow = await prisma.workflow.findFirst({ where: { id, userId } });
  if (!workflow) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const start = new Date();
  const run = await prisma.workflowRun.create({
    data: {
      userId,
      workflowId: id,
      status: "success",
      output: `Simulated run of “${workflow.name}”. Wire real steps into /api/workflows/[id]/run to replace this stub.`,
      startedAt: start,
      endedAt: new Date(),
    },
  });
  return NextResponse.json({ run }, { status: 201 });
}
