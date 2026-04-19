// Deterministic action layer.
//
// Every tool here is pure TypeScript talking to the DB — no model calls.
// The assistant *orchestrates* these tools when needed, but the UI calls them
// directly for every CRUD action. That keeps the common path model-free.

import { prisma } from "@/lib/db";
import { scoreRelevance } from "@/lib/utils";
import { z } from "zod";

// ---- Schemas ----
export const CreateTaskInput = z.object({
  title: z.string().min(1).max(200),
  notes: z.string().max(4000).optional(),
  priority: z.enum(["low", "normal", "high"]).default("normal"),
  dueAt: z.string().datetime().optional(),
});
export const UpdateTaskInput = z.object({
  id: z.string(),
  title: z.string().min(1).max(200).optional(),
  notes: z.string().max(4000).nullable().optional(),
  priority: z.enum(["low", "normal", "high"]).optional(),
  status: z.enum(["open", "done"]).optional(),
  dueAt: z.string().datetime().nullable().optional(),
});

export const CreateNoteInput = z.object({
  title: z.string().min(1).max(200),
  body: z.string().max(20000),
  tags: z.array(z.string()).optional(),
});
export const UpdateNoteInput = z.object({
  id: z.string(),
  title: z.string().min(1).max(200).optional(),
  body: z.string().max(20000).optional(),
  tags: z.array(z.string()).optional(),
});

export const CreateMemoryInput = z.object({
  kind: z.enum(["preference", "fact", "project", "style", "context"]),
  key: z.string().min(1).max(80),
  value: z.string().min(1).max(2000),
  importance: z.number().int().min(1).max(5).default(2),
});
export const UpdateMemoryInput = z.object({
  id: z.string(),
  kind: z.enum(["preference", "fact", "project", "style", "context"]).optional(),
  key: z.string().min(1).max(80).optional(),
  value: z.string().min(1).max(2000).optional(),
  importance: z.number().int().min(1).max(5).optional(),
});

// ---- Tasks ----
export async function createTask(userId: string, input: z.infer<typeof CreateTaskInput>) {
  return prisma.task.create({
    data: {
      userId,
      title: input.title,
      notes: input.notes,
      priority: input.priority,
      dueAt: input.dueAt ? new Date(input.dueAt) : null,
    },
  });
}

export async function listTasks(
  userId: string,
  opts: { status?: "open" | "done"; limit?: number } = {}
) {
  return prisma.task.findMany({
    where: { userId, ...(opts.status ? { status: opts.status } : {}) },
    orderBy: [{ status: "asc" }, { dueAt: "asc" }, { createdAt: "desc" }],
    take: opts.limit ?? 100,
  });
}

export async function updateTask(userId: string, input: z.infer<typeof UpdateTaskInput>) {
  const existing = await prisma.task.findFirst({ where: { id: input.id, userId } });
  if (!existing) throw new Error("NOT_FOUND");
  const completedAt =
    input.status === "done"
      ? existing.completedAt ?? new Date()
      : input.status === "open"
        ? null
        : existing.completedAt;
  return prisma.task.update({
    where: { id: input.id },
    data: {
      title: input.title,
      notes: input.notes,
      priority: input.priority,
      status: input.status,
      dueAt: input.dueAt === null ? null : input.dueAt ? new Date(input.dueAt) : undefined,
      completedAt,
    },
  });
}

export async function deleteTask(userId: string, id: string) {
  await prisma.task.deleteMany({ where: { id, userId } });
  return { ok: true };
}

// ---- Notes ----
export async function createNote(userId: string, input: z.infer<typeof CreateNoteInput>) {
  return prisma.note.create({
    data: {
      userId,
      title: input.title,
      body: input.body,
      tags: (input.tags ?? []).join(","),
    },
  });
}

export async function listNotes(
  userId: string,
  opts: { query?: string; limit?: number } = {}
) {
  const notes = await prisma.note.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    take: 500,
  });
  if (!opts.query) return notes.slice(0, opts.limit ?? 100);
  const scored = notes
    .map((n) => ({ n, s: scoreRelevance(opts.query!, `${n.title} ${n.body} ${n.tags}`) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .map((x) => x.n);
  return scored.slice(0, opts.limit ?? 50);
}

export async function updateNote(userId: string, input: z.infer<typeof UpdateNoteInput>) {
  const existing = await prisma.note.findFirst({ where: { id: input.id, userId } });
  if (!existing) throw new Error("NOT_FOUND");
  return prisma.note.update({
    where: { id: input.id },
    data: {
      title: input.title,
      body: input.body,
      tags: input.tags ? input.tags.join(",") : undefined,
    },
  });
}

export async function deleteNote(userId: string, id: string) {
  await prisma.note.deleteMany({ where: { id, userId } });
  return { ok: true };
}

// ---- Memory ----
export async function createMemory(userId: string, input: z.infer<typeof CreateMemoryInput>) {
  return prisma.memory.create({ data: { userId, ...input } });
}

export async function listMemory(
  userId: string,
  opts: { kind?: string; limit?: number } = {}
) {
  return prisma.memory.findMany({
    where: { userId, ...(opts.kind ? { kind: opts.kind } : {}) },
    orderBy: [{ importance: "desc" }, { updatedAt: "desc" }],
    take: opts.limit ?? 200,
  });
}

export async function updateMemory(
  userId: string,
  input: z.infer<typeof UpdateMemoryInput>
) {
  const existing = await prisma.memory.findFirst({ where: { id: input.id, userId } });
  if (!existing) throw new Error("NOT_FOUND");
  return prisma.memory.update({
    where: { id: input.id },
    data: {
      kind: input.kind,
      key: input.key,
      value: input.value,
      importance: input.importance,
    },
  });
}

export async function deleteMemory(userId: string, id: string) {
  await prisma.memory.deleteMany({ where: { id, userId } });
  return { ok: true };
}

// Top-k memory retrieval — used *sparingly* before model calls.
export async function retrieveMemory(userId: string, query: string, k = 4) {
  const items = await prisma.memory.findMany({ where: { userId } });
  const scored = items
    .map((m) => ({
      m,
      s: scoreRelevance(query, `${m.key} ${m.value}`) + m.importance * 0.5,
    }))
    .sort((a, b) => b.s - a.s);
  return scored.slice(0, k).map((x) => x.m);
}

// ---- Dashboard summary (fully local, no model) ----
export async function getDashboardSummary(userId: string) {
  const [openTasks, doneToday, recentNotes, recentChats, recentMemories] =
    await Promise.all([
      prisma.task.findMany({
        where: { userId, status: "open" },
        orderBy: [{ dueAt: "asc" }, { priority: "desc" }],
        take: 5,
      }),
      prisma.task.count({
        where: {
          userId,
          status: "done",
          completedAt: { gte: startOfToday() },
        },
      }),
      prisma.note.findMany({
        where: { userId },
        orderBy: { updatedAt: "desc" },
        take: 3,
      }),
      prisma.chat.findMany({
        where: { userId },
        orderBy: { updatedAt: "desc" },
        take: 3,
        include: { messages: { orderBy: { createdAt: "desc" }, take: 1 } },
      }),
      prisma.memory.count({ where: { userId } }),
    ]);
  return { openTasks, doneToday, recentNotes, recentChats, recentMemories };
}

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}
