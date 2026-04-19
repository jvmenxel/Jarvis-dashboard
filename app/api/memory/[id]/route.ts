import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth";
import { UpdateMemoryInput, updateMemory, deleteMemory } from "@/lib/tools";

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const userId = await getCurrentUserId();
  const { id } = await ctx.params;
  const body = await req.json();
  const input = UpdateMemoryInput.parse({ ...body, id });
  const item = await updateMemory(userId, input);
  return NextResponse.json({ item });
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const userId = await getCurrentUserId();
  const { id } = await ctx.params;
  await deleteMemory(userId, id);
  return NextResponse.json({ ok: true });
}
