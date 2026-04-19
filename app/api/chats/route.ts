import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const userId = await getCurrentUserId();
  const chats = await prisma.chat.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    take: 50,
    include: { messages: { orderBy: { createdAt: "desc" }, take: 1 } },
  });
  return NextResponse.json({ chats });
}

export async function POST() {
  const userId = await getCurrentUserId();
  const chat = await prisma.chat.create({
    data: { userId, title: "New conversation" },
  });
  return NextResponse.json({ chat }, { status: 201 });
}
