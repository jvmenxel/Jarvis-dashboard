import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth";
import { CreateMemoryInput, createMemory, listMemory } from "@/lib/tools";

export async function GET(req: Request) {
  const userId = await getCurrentUserId();
  const kind = new URL(req.url).searchParams.get("kind") ?? undefined;
  const items = await listMemory(userId, { kind });
  return NextResponse.json({ items });
}

export async function POST(req: Request) {
  const userId = await getCurrentUserId();
  const body = await req.json();
  const input = CreateMemoryInput.parse(body);
  const item = await createMemory(userId, input);
  return NextResponse.json({ item }, { status: 201 });
}
