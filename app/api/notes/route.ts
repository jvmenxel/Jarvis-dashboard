import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth";
import { CreateNoteInput, createNote, listNotes } from "@/lib/tools";

export async function GET(req: Request) {
  const userId = await getCurrentUserId();
  const q = new URL(req.url).searchParams.get("q") ?? undefined;
  const notes = await listNotes(userId, { query: q });
  return NextResponse.json({ notes });
}

export async function POST(req: Request) {
  const userId = await getCurrentUserId();
  const body = await req.json();
  const input = CreateNoteInput.parse(body);
  const note = await createNote(userId, input);
  return NextResponse.json({ note }, { status: 201 });
}
