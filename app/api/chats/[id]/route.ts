import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const userId = await getCurrentUserId();
  const { id } = await ctx.params;
  const chat = await prisma.chat.findFirst({
    where: { id, userId },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });
  if (!chat) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ chat });
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const userId = await getCurrentUserId();
  const { id } = await ctx.params;
  await prisma.chat.deleteMany({ where: { id, userId } });
  return NextResponse.json({ ok: true });
}
