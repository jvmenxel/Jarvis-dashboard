"use client";

import { useMemo, useState } from "react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { formatAgo, scoreRelevance } from "@/lib/utils";
import { Plus, Search, Trash2 } from "lucide-react";

type Note = {
  id: string;
  title: string;
  body: string;
  tags: string;
  createdAt: string;
  updatedAt: string;
};

export function NotesClient({ initialNotes }: { initialNotes: Note[] }) {
  const [notes, setNotes] = useState<Note[]>(initialNotes);
  const [selected, setSelected] = useState<Note | null>(initialNotes[0] ?? null);
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState({ title: "", body: "" });

  const filtered = useMemo(() => {
    if (!query.trim()) return notes;
    return notes
      .map((n) => ({ n, s: scoreRelevance(query, `${n.title} ${n.body} ${n.tags}`) }))
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s)
      .map((x) => x.n);
  }, [notes, query]);

  async function create() {
    const title = draft.title.trim() || "Untitled";
    const res = await fetch("/api/notes", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title, body: draft.body }),
    });
    const { note } = await res.json();
    setNotes((prev) => [note, ...prev]);
    setSelected(note);
    setCreating(false);
    setDraft({ title: "", body: "" });
  }

  async function save(n: Note) {
    setNotes((prev) => prev.map((x) => (x.id === n.id ? n : x)));
    await fetch(`/api/notes/${n.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: n.title, body: n.body }),
    });
  }

  async function remove(id: string) {
    setNotes((prev) => prev.filter((x) => x.id !== id));
    if (selected?.id === id) setSelected(null);
    await fetch(`/api/notes/${id}`, { method: "DELETE" });
  }

  return (
    <div className="space-y-6">
      <header className="flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold">Notes</h1>
        <Button variant="primary" onClick={() => setCreating(true)}>
          <Plus className="size-4" /> New note
        </Button>
      </header>

      {creating && (
        <Card>
          <CardHeader><CardTitle>New note</CardTitle></CardHeader>
          <CardBody className="pt-0 space-y-3">
            <Input
              placeholder="Title"
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            />
            <Textarea
              rows={6}
              placeholder="Start writing…"
              value={draft.body}
              onChange={(e) => setDraft({ ...draft, body: e.target.value })}
            />
            <div className="flex gap-2 justify-end">
              <Button onClick={() => setCreating(false)}>Cancel</Button>
              <Button variant="primary" onClick={create}>
                Save
              </Button>
            </div>
          </CardBody>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-[320px_1fr] gap-4">
        <Card className="overflow-hidden">
          <div className="px-3 py-2 border-b border-border flex items-center gap-2">
            <Search className="size-3.5 text-fg-subtle" />
            <input
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-fg-subtle"
              placeholder="Search notes…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <ul className="max-h-[65vh] overflow-y-auto">
            {filtered.length === 0 ? (
              <li className="px-4 py-8 text-center text-sm text-fg-subtle">
                No matches.
              </li>
            ) : (
              filtered.map((n) => (
                <li key={n.id}>
                  <button
                    onClick={() => setSelected(n)}
                    className={
                      "w-full text-left px-4 py-3 border-b border-border/60 hover:bg-panel " +
                      (selected?.id === n.id ? "bg-panel" : "")
                    }
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-sm truncate">{n.title}</span>
                      <span className="text-[10px] text-fg-subtle">{formatAgo(n.updatedAt)}</span>
                    </div>
                    <p className="mt-0.5 text-xs text-fg-muted line-clamp-1">{n.body}</p>
                  </button>
                </li>
              ))
            )}
          </ul>
        </Card>

        <Card className="min-h-[65vh]">
          {selected ? (
            <CardBody className="space-y-3 py-5">
              <div className="flex items-center justify-between gap-2">
                <Input
                  value={selected.title}
                  onChange={(e) => setSelected({ ...selected, title: e.target.value })}
                  onBlur={() => save(selected)}
                  className="text-lg font-semibold h-auto py-2"
                />
                <Button variant="danger" size="sm" onClick={() => remove(selected.id)}>
                  <Trash2 className="size-4" />
                </Button>
              </div>
              <Textarea
                rows={18}
                value={selected.body}
                onChange={(e) => setSelected({ ...selected, body: e.target.value })}
                onBlur={() => save(selected)}
              />
              <div className="text-xs text-fg-subtle">
                Updated {formatAgo(selected.updatedAt)}
              </div>
            </CardBody>
          ) : (
            <CardBody className="py-20 text-center text-fg-subtle">
              Select or create a note.
            </CardBody>
          )}
        </Card>
      </div>
    </div>
  );
}
