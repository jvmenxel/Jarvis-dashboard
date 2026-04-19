"use client";

import { useMemo, useState } from "react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2 } from "lucide-react";

type Kind = "preference" | "fact" | "project" | "style" | "context";
type Item = {
  id: string;
  kind: Kind;
  key: string;
  value: string;
  importance: number;
  updatedAt: string;
};

const KINDS: Kind[] = ["preference", "fact", "project", "style", "context"];

export function MemoryClient({ initial }: { initial: Item[] }) {
  const [items, setItems] = useState<Item[]>(initial);
  const [filter, setFilter] = useState<Kind | "all">("all");
  const [draft, setDraft] = useState({
    kind: "fact" as Kind,
    key: "",
    value: "",
    importance: 2,
  });

  const filtered = useMemo(
    () => (filter === "all" ? items : items.filter((i) => i.kind === filter)),
    [items, filter]
  );

  async function add() {
    if (!draft.key.trim() || !draft.value.trim()) return;
    const res = await fetch("/api/memory", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(draft),
    });
    const { item } = await res.json();
    setItems((prev) => [item, ...prev]);
    setDraft({ kind: draft.kind, key: "", value: "", importance: 2 });
  }

  async function remove(id: string) {
    setItems((prev) => prev.filter((x) => x.id !== id));
    await fetch(`/api/memory/${id}`, { method: "DELETE" });
  }

  async function patch(item: Item, partial: Partial<Item>) {
    const next = { ...item, ...partial };
    setItems((prev) => prev.map((x) => (x.id === item.id ? next : x)));
    await fetch(`/api/memory/${item.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(partial),
    });
  }

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">Long-term memory</h1>
        <p className="text-sm text-fg-muted max-w-2xl">
          The assistant retrieves only the most relevant items per request — never
          the full store. Keep this tight so context stays sharp.
        </p>
      </header>

      <Card>
        <CardHeader><CardTitle>Add memory</CardTitle></CardHeader>
        <CardBody className="pt-0 grid grid-cols-1 md:grid-cols-[120px_180px_1fr_auto] gap-2">
          <select
            value={draft.kind}
            onChange={(e) => setDraft({ ...draft, kind: e.target.value as Kind })}
            className="h-9 rounded-lg border border-border bg-panel px-2 text-sm"
          >
            {KINDS.map((k) => (
              <option key={k}>{k}</option>
            ))}
          </select>
          <Input
            placeholder="key, e.g. writing_tone"
            value={draft.key}
            onChange={(e) => setDraft({ ...draft, key: e.target.value })}
          />
          <Input
            placeholder="value"
            value={draft.value}
            onChange={(e) => setDraft({ ...draft, value: e.target.value })}
          />
          <Button variant="primary" onClick={add}>
            <Plus className="size-4" /> Save
          </Button>
        </CardBody>
      </Card>

      <div className="flex gap-1">
        <button
          onClick={() => setFilter("all")}
          className={
            filter === "all"
              ? "px-3 py-1 text-xs rounded-full bg-accent/15 text-accent"
              : "px-3 py-1 text-xs rounded-full text-fg-muted hover:text-fg"
          }
        >
          all
        </button>
        {KINDS.map((k) => (
          <button
            key={k}
            onClick={() => setFilter(k)}
            className={
              filter === k
                ? "px-3 py-1 text-xs rounded-full bg-accent/15 text-accent"
                : "px-3 py-1 text-xs rounded-full text-fg-muted hover:text-fg"
            }
          >
            {k}
          </button>
        ))}
      </div>

      <Card>
        <CardBody className="py-2">
          {filtered.length === 0 ? (
            <div className="py-10 text-center text-sm text-fg-subtle">Empty.</div>
          ) : (
            <ul className="divide-y divide-border/60">
              {filtered.map((i) => (
                <li key={i.id} className="py-3 flex items-start gap-3">
                  <Badge tone="accent">{i.kind}</Badge>
                  <div className="flex-1 min-w-0 space-y-1">
                    <input
                      value={i.key}
                      onChange={(e) => patch(i, { key: e.target.value })}
                      className="text-sm font-medium bg-transparent outline-none w-full"
                    />
                    <Textarea
                      rows={2}
                      value={i.value}
                      onChange={(e) => patch(i, { value: e.target.value })}
                    />
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <select
                      value={i.importance}
                      onChange={(e) => patch(i, { importance: Number(e.target.value) })}
                      className="h-7 rounded-md border border-border bg-panel px-1 text-xs"
                      title="importance"
                    >
                      {[1, 2, 3, 4, 5].map((n) => (
                        <option key={n}>{n}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => remove(i.id)}
                      className="text-fg-subtle hover:text-danger"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
