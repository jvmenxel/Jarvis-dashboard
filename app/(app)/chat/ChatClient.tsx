"use client";

import { useEffect, useRef, useState } from "react";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatAgo } from "@/lib/utils";
import { Plus, Send, Trash2, Sparkles } from "lucide-react";

type Chat = { id: string; title: string | null; updatedAt: string };
type Message = { id: string; role: string; content: string; createdAt: string };

type Props = {
  initialChats: Chat[];
  initialChat: Chat | null;
  initialMessages: Message[];
  hasProvider: boolean;
};

export function ChatClient({
  initialChats,
  initialChat,
  initialMessages,
  hasProvider,
}: Props) {
  const [chats, setChats] = useState<Chat[]>(initialChats);
  const [current, setCurrent] = useState<Chat | null>(initialChat);
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight });
  }, [messages.length]);

  async function openChat(c: Chat) {
    setCurrent(c);
    const res = await fetch(`/api/chats/${c.id}`);
    const { chat } = await res.json();
    setMessages(chat.messages);
  }

  async function newChat() {
    const res = await fetch("/api/chats", { method: "POST" });
    const { chat } = await res.json();
    setChats((prev) => [chat, ...prev]);
    setCurrent(chat);
    setMessages([]);
  }

  async function deleteChat(id: string) {
    await fetch(`/api/chats/${id}`, { method: "DELETE" });
    setChats((prev) => prev.filter((c) => c.id !== id));
    if (current?.id === id) {
      setCurrent(null);
      setMessages([]);
    }
  }

  async function send() {
    const text = draft.trim();
    if (!text || sending) return;
    let chat = current;
    if (!chat) {
      const res = await fetch("/api/chats", { method: "POST" });
      const created = await res.json();
      chat = created.chat;
      setChats((prev) => [created.chat, ...prev]);
      setCurrent(created.chat);
    }
    setDraft("");
    setSending(true);
    const optimistic: Message = {
      id: "tmp-" + Date.now(),
      role: "user",
      content: text,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);
    try {
      const res = await fetch(`/api/chats/${chat!.id}/messages`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ content: text }),
      });
      const data = await res.json();
      setMessages((prev) => [
        ...prev.filter((m) => m.id !== optimistic.id),
        { ...optimistic, id: optimistic.id + "-u" },
        data.assistant,
      ]);
      setChats((prev) =>
        prev.map((c) =>
          c.id === chat!.id ? { ...c, updatedAt: new Date().toISOString() } : c
        )
      );
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="h-[calc(100vh-57px)] grid grid-cols-1 md:grid-cols-[280px_1fr]">
      <aside className="hidden md:flex flex-col border-r border-border bg-panel/40">
        <div className="p-3 border-b border-border flex items-center justify-between">
          <span className="text-xs uppercase tracking-widest text-fg-subtle">
            Conversations
          </span>
          <Button size="sm" variant="secondary" onClick={newChat}>
            <Plus className="size-3.5" /> New
          </Button>
        </div>
        <ul className="flex-1 overflow-y-auto">
          {chats.length === 0 && (
            <li className="p-4 text-xs text-fg-subtle">No conversations yet.</li>
          )}
          {chats.map((c) => (
            <li key={c.id} className="group">
              <button
                onClick={() => openChat(c)}
                className={
                  "w-full text-left px-3 py-2.5 border-b border-border/60 hover:bg-panel " +
                  (current?.id === c.id ? "bg-panel" : "")
                }
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm font-medium truncate">
                    {c.title ?? "Untitled"}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteChat(c.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 text-fg-subtle hover:text-danger"
                    aria-label="delete chat"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
                <div className="text-[10px] text-fg-subtle mt-0.5">
                  {formatAgo(c.updatedAt)}
                </div>
              </button>
            </li>
          ))}
        </ul>
      </aside>

      <section className="flex flex-col min-w-0">
        <div
          ref={scroller}
          className="flex-1 overflow-y-auto px-6 md:px-10 py-6 space-y-4"
        >
          {!hasProvider && (
            <Card className="max-w-2xl mx-auto">
              <CardBody className="py-4 flex items-start gap-3">
                <Sparkles className="size-5 text-accent shrink-0 mt-0.5" />
                <div className="text-sm">
                  <div className="font-medium">Local mode</div>
                  <p className="text-fg-muted">
                    No AI provider key configured. Deterministic shortcuts still
                    work — try <code className="text-accent">add task: …</code> or{" "}
                    <code className="text-accent">remember: …</code>.
                  </p>
                </div>
              </CardBody>
            </Card>
          )}
          {messages.length === 0 && (
            <div className="text-center text-fg-subtle pt-20 space-y-3">
              <div className="inline-flex items-center gap-2 text-xs">
                <Badge tone="accent">idle</Badge>
                <span>Assistant ready.</span>
              </div>
              <h2 className="text-2xl font-semibold text-fg">How can I help?</h2>
              <p className="text-sm">
                Try: <em>list tasks</em>, <em>add task: review Q2 plan</em>, or{" "}
                <em>help</em>.
              </p>
            </div>
          )}
          {messages.map((m) => (
            <Bubble key={m.id} msg={m} />
          ))}
          {sending && (
            <div className="flex items-center gap-2 text-xs text-fg-subtle pl-1">
              <span className="size-1.5 rounded-full bg-accent animate-pulse" />
              thinking…
            </div>
          )}
        </div>
        <div className="border-t border-border p-3 md:p-4 bg-panel/40">
          <div className="max-w-3xl mx-auto flex gap-2 items-end">
            <Textarea
              rows={2}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder="Message Jarvis… (Enter to send, Shift+Enter for newline)"
              className="flex-1"
            />
            <Button variant="primary" onClick={send} disabled={sending}>
              <Send className="size-4" />
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}

function Bubble({ msg }: { msg: Message }) {
  const isUser = msg.role === "user";
  return (
    <div className={"flex " + (isUser ? "justify-end" : "justify-start")}>
      <div
        className={
          "max-w-[78%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-relaxed " +
          (isUser
            ? "bg-accent text-black rounded-br-md"
            : "bg-panel border border-border text-fg rounded-bl-md")
        }
      >
        {msg.content}
      </div>
    </div>
  );
}
