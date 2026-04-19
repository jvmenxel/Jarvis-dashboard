// Intent router — decides whether a user turn can be handled locally with a
// deterministic response, or needs a model call. Keeps tokens low by short-
// circuiting common CRUD-ish asks before the model ever sees them.

export type Intent =
  | { kind: "help" }
  | { kind: "smalltalk" }
  | { kind: "create_task"; title: string }
  | { kind: "list_tasks" }
  | { kind: "save_note"; title: string; body: string }
  | { kind: "search_notes"; query: string }
  | { kind: "save_memory"; key: string; value: string }
  | { kind: "model" };

const RE_CREATE_TASK = /^(?:add|create|new)\s+task[:\-]?\s+(.+)$/i;
const RE_LIST_TASKS = /^(?:list|show)\s+(?:my\s+)?tasks\s*$/i;
const RE_SAVE_NOTE = /^(?:save|new)\s+note[:\-]?\s+(.+)$/i;
const RE_SEARCH_NOTES = /^(?:find|search)\s+notes?\s+(?:for\s+)?(.+)$/i;
const RE_REMEMBER = /^remember[:\-]?\s+(.+)$/i;
const RE_HELP = /^(?:help|what can you do\??)\s*$/i;
const RE_SMALLTALK = /^(?:hi|hello|hey|thanks|thank you|ok|okay)\s*!?\s*$/i;

export function route(message: string): Intent {
  const m = message.trim();
  if (RE_HELP.test(m)) return { kind: "help" };
  if (RE_SMALLTALK.test(m)) return { kind: "smalltalk" };

  const mt = m.match(RE_CREATE_TASK);
  if (mt) return { kind: "create_task", title: mt[1].trim() };

  if (RE_LIST_TASKS.test(m)) return { kind: "list_tasks" };

  const sn = m.match(RE_SAVE_NOTE);
  if (sn) {
    const rest = sn[1].trim();
    const [title, ...bodyParts] = rest.split(/\s*[\n\-—]\s*/);
    return {
      kind: "save_note",
      title: title.slice(0, 120),
      body: bodyParts.join(" - ") || rest,
    };
  }

  const fn = m.match(RE_SEARCH_NOTES);
  if (fn) return { kind: "search_notes", query: fn[1].trim() };

  const rem = m.match(RE_REMEMBER);
  if (rem) {
    const rest = rem[1].trim();
    const [key, ...rest2] = rest.split(/\s*[:=]\s*/);
    const value = rest2.join(": ").trim() || rest;
    return { kind: "save_memory", key: key.slice(0, 60), value };
  }

  return { kind: "model" };
}

export function helpText() {
  return [
    "I'm your local-first assistant. Deterministic shortcuts (free, no model call):",
    "",
    "• `add task: <title>` — creates a task",
    "• `list tasks` — lists open tasks",
    "• `save note: <title> - <body>` — saves a note",
    "• `find notes <query>` — searches notes",
    "• `remember: <key>: <value>` — saves long-term memory",
    "",
    "Anything else goes to the AI when a provider key is configured.",
  ].join("\n");
}
