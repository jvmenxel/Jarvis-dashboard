"use client";

import { useState } from "react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatAgo } from "@/lib/utils";
import { Plus, Play, Trash2 } from "lucide-react";

type Run = {
  id: string;
  status: string;
  output: string | null;
  error: string | null;
  startedAt: string;
  endedAt: string | null;
};
type Workflow = {
  id: string;
  name: string;
  description: string | null;
  trigger: string;
  enabled: boolean;
  updatedAt: string;
  runs: Run[];
};

export function AutomationsClient({ initial }: { initial: Workflow[] }) {
  const [workflows, setWorkflows] = useState<Workflow[]>(initial);
  const [draft, setDraft] = useState({ name: "", description: "" });
  const [runningId, setRunningId] = useState<string | null>(null);

  async function add() {
    if (!draft.name.trim()) return;
    const res = await fetch("/api/workflows", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(draft),
    });
    const { workflow } = await res.json();
    setWorkflows((prev) => [{ ...workflow, runs: [] }, ...prev]);
    setDraft({ name: "", description: "" });
  }

  async function run(id: string) {
    setRunningId(id);
    try {
      const res = await fetch(`/api/workflows/${id}/run`, { method: "POST" });
      const { run } = await res.json();
      setWorkflows((prev) =>
        prev.map((w) => (w.id === id ? { ...w, runs: [run, ...w.runs].slice(0, 5) } : w))
      );
    } finally {
      setRunningId(null);
    }
  }

  async function remove(id: string) {
    setWorkflows((prev) => prev.filter((w) => w.id !== id));
    await fetch(`/api/workflows/${id}`, { method: "DELETE" });
  }

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">Automations</h1>
        <p className="text-sm text-fg-muted max-w-2xl">
          A clean abstraction ready to plug into a real runner — e.g. an
          n8n Community instance — in phase 3. Manual runs are recorded now.
        </p>
      </header>

      <Card>
        <CardHeader><CardTitle>New workflow</CardTitle></CardHeader>
        <CardBody className="pt-0 grid grid-cols-1 md:grid-cols-[1fr_2fr_auto] gap-2">
          <Input
            placeholder="Name"
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          />
          <Input
            placeholder="Description (optional)"
            value={draft.description}
            onChange={(e) => setDraft({ ...draft, description: e.target.value })}
          />
          <Button variant="primary" onClick={add}>
            <Plus className="size-4" /> Create
          </Button>
        </CardBody>
      </Card>

      {workflows.length === 0 ? (
        <Card><CardBody className="py-10 text-center text-fg-subtle text-sm">
          No workflows yet.
        </CardBody></Card>
      ) : (
        <div className="space-y-4">
          {workflows.map((w) => (
            <Card key={w.id}>
              <CardBody className="space-y-3 py-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">{w.name}</h3>
                      <Badge tone={w.enabled ? "ok" : "default"}>
                        {w.trigger}
                      </Badge>
                    </div>
                    {w.description && (
                      <p className="text-sm text-fg-muted mt-1">{w.description}</p>
                    )}
                    <p className="text-[11px] text-fg-subtle mt-1">
                      Updated {formatAgo(w.updatedAt)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => run(w.id)}
                      disabled={runningId === w.id}
                    >
                      <Play className="size-3.5" />
                      {runningId === w.id ? "Running…" : "Run"}
                    </Button>
                    <Button variant="danger" size="sm" onClick={() => remove(w.id)}>
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
                {w.runs.length > 0 && (
                  <div className="rounded-lg border border-border/60 divide-y divide-border/60">
                    {w.runs.map((r) => (
                      <div
                        key={r.id}
                        className="px-3 py-2 flex items-center gap-3 text-xs"
                      >
                        <Badge
                          tone={
                            r.status === "success"
                              ? "ok"
                              : r.status === "error"
                                ? "danger"
                                : "warn"
                          }
                        >
                          {r.status}
                        </Badge>
                        <span className="text-fg-muted flex-1 truncate">
                          {r.output ?? r.error ?? "—"}
                        </span>
                        <span className="text-fg-subtle">{formatAgo(r.startedAt)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
