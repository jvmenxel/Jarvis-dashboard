import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth";
import { CreateTaskInput, createTask, listTasks } from "@/lib/tools";

export async function GET(req: Request) {
  const userId = await getCurrentUserId();
  const status = new URL(req.url).searchParams.get("status") as
    | "open"
    | "done"
    | null;
  const tasks = await listTasks(userId, status ? { status } : {});
  return NextResponse.json({ tasks });
}

export async function POST(req: Request) {
  const userId = await getCurrentUserId();
  const body = await req.json();
  const input = CreateTaskInput.parse(body);
  const task = await createTask(userId, input);
  return NextResponse.json({ task }, { status: 201 });
}
