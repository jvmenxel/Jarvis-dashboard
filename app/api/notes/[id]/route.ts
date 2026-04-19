import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth";
import { UpdateNoteInput, updateNote, deleteNote } from "@/lib/tools";

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const userId = await getCurrentUserId();
  const { id } = await ctx.params;
  const body = await req.json();
  const input = UpdateNoteInput.parse({ ...body, id });
  const note = await updateNote(userId, input);
  return NextResponse.json({ note });
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const userId = await getCurrentUserId();
  const { id } = await ctx.params;
  await deleteNote(userId, id);
  return NextResponse.json({ ok: true });
}
