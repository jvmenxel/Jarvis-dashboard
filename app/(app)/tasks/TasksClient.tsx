"use client";

import { useState, useTransition } from "react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatRelative } from "@/lib/utils";
import { Check, Trash2, Flag, CalendarClock, Plus } from "lucide-react";

type Task = {
  id: string;
  title: string;
  notes: string | null;
  priority: "low" | "normal" | "high";
  status: "open" | "done";
  dueAt: string | null;
  createdAt: string;
};

export function TasksClient({ initialTasks }: { initialTasks: Task[] }) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<Task["priority"]>("normal");
  const [filter, setFilter] = useState<"all" | "open" | "done">("open");
  const [, start] = useTransition();

  async function addTask() {
    const t = title.trim();
    if (!t) return;
    setTitle("");
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: t, priority }),
    });
    const { task } = await res.json();
    setTasks((prev) => [task, ...prev]);
  }

  function toggle(id: string) {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    const next = task.status === "open" ? "done" : "open";
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status: next } : t))
    );
    start(async () => {
      await fetch(`/api/tasks/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
    });
  }

  function remove(id: string) {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    start(async () => {
      await fetch(`/api/tasks/${id}`, { method: "DELETE" });
    });
  }

  function cyclePriority(id: string) {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    const order: Task["priority"][] = ["low", "normal", "high"];
    const next = order[(order.indexOf(task.priority) + 1) % order.length];
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, priority: next } : t)));
    start(async () => {
      await fetch(`/api/tasks/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ priority: next }),
      });
    });
  }

  const filtered = tasks.filter((t) => filter === "all" || t.status === filter);

  return (
    <div className="space-y-6">
      <header className="flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold">Tasks</h1>
        <div className="flex gap-1 text-xs">
          {(["open", "done", "all"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={
                filter === f
                  ? "px-3 py-1 rounded-full bg-accent/15 text-accent"
                  : "px-3 py-1 rounded-full text-fg-muted hover:text-fg"
              }
            >
              {f}
            </button>
          ))}
        </div>
      </header>

      <Card>
        <CardBody className="flex gap-2 py-4">
          <Input
            placeholder="Add a task…"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") addTask();
            }}
          />
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value as Task["priority"])}
            className="h-9 rounded-lg border border-border bg-panel px-2 text-sm"
          >
            <option value="low">low</option>
            <option value="normal">normal</option>
            <option value="high">high</option>
          </select>
          <Button variant="primary" onClick={addTask}>
            <Plus className="size-4" /> Add
          </Button>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            {filtered.length} {filter === "all" ? "total" : filter} task{filtered.length === 1 ? "" : "s"}
          </CardTitle>
        </CardHeader>
        <CardBody className="pt-0">
          {filtered.length === 0 ? (
            <div className="py-8 text-center text-fg-subtle text-sm">
              Nothing here.
            </div>
          ) : (
            <ul className="divide-y divide-border/60">
              {filtered.map((t) => (
                <li key={t.id} className="flex items-center gap-3 py-2.5">
                  <button
                    onClick={() => toggle(t.id)}
                    aria-label="toggle"
                    className={
                      t.status === "done"
                        ? "size-5 rounded-md border border-accent bg-accent text-black flex items-center justify-center"
                        : "size-5 rounded-md border border-border-strong hover:border-accent"
                    }
                  >
                    {t.status === "done" && <Check className="size-3" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div
                      className={
                        "text-sm " + (t.status === "done" ? "line-through text-fg-subtle" : "")
                      }
                    >
                      {t.title}
                    </div>
                    {t.dueAt && (
                      <div className="text-[11px] text-fg-subtle flex items-center gap-1">
                        <CalendarClock className="size-3" /> {formatRelative(t.dueAt)}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => cyclePriority(t.id)}
                    className="shrink-0"
                    aria-label="cycle priority"
                  >
                    <Badge
                      tone={
                        t.priority === "high" ? "danger" : t.priority === "low" ? "default" : "accent"
                      }
                    >
                      <Flag className="size-3" /> {t.priority}
                    </Badge>
                  </button>
                  <button
                    onClick={() => remove(t.id)}
                    className="text-fg-subtle hover:text-danger p-1"
                    aria-label="delete"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
