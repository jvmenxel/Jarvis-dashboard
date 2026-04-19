import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth";
import { UpdateTaskInput, updateTask, deleteTask } from "@/lib/tools";

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const userId = await getCurrentUserId();
  const { id } = await ctx.params;
  const body = await req.json();
  const input = UpdateTaskInput.parse({ ...body, id });
  const task = await updateTask(userId, input);
  return NextResponse.json({ task });
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const userId = await getCurrentUserId();
  const { id } = await ctx.params;
  await deleteTask(userId, id);
  return NextResponse.json({ ok: true });
}
