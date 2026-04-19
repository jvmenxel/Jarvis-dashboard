import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUserId } from "@/lib/auth";
import { prisma } from "@/lib/db";

const Body = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(500).optional(),
  trigger: z.enum(["manual", "schedule", "webhook"]).default("manual"),
  config: z.string().optional(),
});

export async function GET() {
  const userId = await getCurrentUserId();
  const workflows = await prisma.workflow.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    include: { runs: { orderBy: { startedAt: "desc" }, take: 1 } },
  });
  return NextResponse.json({ workflows });
}

export async function POST(req: Request) {
  const userId = await getCurrentUserId();
  const input = Body.parse(await req.json());
  const wf = await prisma.workflow.create({
    data: {
      userId,
      name: input.name,
      description: input.description,
      trigger: input.trigger,
      config: input.config ?? "{}",
    },
  });
  return NextResponse.json({ workflow: wf }, { status: 201 });
}
