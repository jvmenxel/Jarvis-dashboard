import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const userId = await getCurrentUserId();
  const { id } = await ctx.params;
  await prisma.workflow.deleteMany({ where: { id, userId } });
  return NextResponse.json({ ok: true });
}
