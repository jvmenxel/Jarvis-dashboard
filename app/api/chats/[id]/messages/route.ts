// POST a user message, run the intent router, invoke AI only when necessary,
// persist both turns. Keeps prompt context tiny via rolling summary + top-k
// memory retrieval.

import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUserId } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { route, helpText } from "@/lib/ai/router";
import { generate, type ChatTurn } from "@/lib/ai";
import {
  createTask,
  createNote,
  createMemory,
  listTasks,
  listNotes,
  retrieveMemory,
} from "@/lib/tools";

const Body = z.object({ content: z.string().min(1).max(4000) });

const MAX_HISTORY = Number(process.env.AI_MAX_HISTORY_MESSAGES ?? 8);
const MAX_MEMORY = Number(process.env.AI_MAX_MEMORY_ITEMS ?? 4);

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const userId = await getCurrentUserId();
  const { id: chatId } = await ctx.params;
  const { content } = Body.parse(await req.json());

  const chat = await prisma.chat.findFirst({ where: { id: chatId, userId } });
  if (!chat) return NextResponse.json({ error: "not_found" }, { status: 404 });

  // Persist the user turn immediately.
  await prisma.message.create({
    data: { chatId, role: "user", content },
  });

  // Route deterministically first.
  const intent = route(content);
  let assistantContent = "";
  let usedModel = false;

  switch (intent.kind) {
    case "help":
      assistantContent = helpText();
      break;
    case "smalltalk":
      assistantContent = "Hi. Tell me what to do — or type `help`.";
      break;
    case "create_task": {
      const t = await createTask(userId, { title: intent.title, priority: "normal" });
      assistantContent = `Created task: “${t.title}”.`;
      break;
    }
    case "list_tasks": {
      const tasks = await listTasks(userId, { status: "open", limit: 10 });
      assistantContent =
        tasks.length === 0
          ? "You have no open tasks."
          : "Open tasks:\n" + tasks.map((t, i) => `${i + 1}. ${t.title}`).join("\n");
      break;
    }
    case "save_note": {
      const n = await createNote(userId, { title: intent.title, body: intent.body });
      assistantContent = `Saved note: “${n.title}”.`;
      break;
    }
    case "search_notes": {
      const results = await listNotes(userId, { query: intent.query, limit: 5 });
      assistantContent =
        results.length === 0
          ? `No notes matched “${intent.query}”.`
          : "Matches:\n" +
            results
              .map((n, i) => `${i + 1}. ${n.title} — ${truncate(n.body, 80)}`)
              .join("\n");
      break;
    }
    case "save_memory": {
      const m = await createMemory(userId, {
        kind: "fact",
        key: intent.key,
        value: intent.value,
        importance: 3,
      });
      assistantContent = `Remembered “${m.key}”.`;
      break;
    }
    case "model": {
      // Only here do we spend tokens.
      usedModel = true;
      const history = await prisma.message.findMany({
        where: { chatId },
        orderBy: { createdAt: "desc" },
        take: MAX_HISTORY,
      });
      history.reverse();
      const memory = await retrieveMemory(userId, content, MAX_MEMORY);

      const system =
        "You are Jarvis, a concise executive assistant. " +
        "Respond in 1-4 short sentences unless explicitly asked for more. " +
        "Prefer bullet points for lists. Never invent facts about the user." +
        (memory.length > 0
          ? "\n\nRelevant memory about the user:\n" +
            memory.map((m) => `- ${m.key}: ${m.value}`).join("\n")
          : "") +
        (chat.summary ? `\n\nConversation so far: ${chat.summary}` : "");

      const messages: ChatTurn[] = history.map((m) => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: m.content,
      }));

      const res = await generate({ userId, size: "small", system, messages });
      assistantContent = res.content.trim() || "I'm here.";

      // Rolling summary: cheap deterministic trim (first ~400 chars of the
      // previous summary + the latest user turn). No extra model call.
      const nextSummary = makeRollingSummary(chat.summary, content, assistantContent);
      await prisma.chat.update({ where: { id: chatId }, data: { summary: nextSummary } });
      break;
    }
  }

  const assistantMessage = await prisma.message.create({
    data: {
      chatId,
      role: "assistant",
      content: assistantContent,
      tokensIn: usedModel ? 1 : 0,
      tokensOut: usedModel ? 1 : 0,
    },
  });

  // Lazy-title if chat has no title yet.
  if (!chat.title || chat.title === "New conversation") {
    const title = content.split(/\s+/).slice(0, 6).join(" ").slice(0, 60);
    await prisma.chat.update({ where: { id: chatId }, data: { title } });
  } else {
    await prisma.chat.update({ where: { id: chatId }, data: { updatedAt: new Date() } });
  }

  return NextResponse.json({
    assistant: assistantMessage,
    intent: intent.kind,
    usedModel,
  });
}

function truncate(s: string, n: number) {
  return s.length <= n ? s : s.slice(0, n - 1) + "…";
}

function makeRollingSummary(prev: string | null, user: string, assistant: string) {
  const base = prev ? prev.slice(0, 300) : "";
  const turn = `User: ${user.slice(0, 160)} | Jarvis: ${assistant.slice(0, 160)}`;
  return (base + " " + turn).slice(0, 600);
}
