// Slack fetcher — pulls the most recent message from a configured DM/channel
// (usually the Cowork bot DM) and returns raw text.
//
// Works with a user token (scopes: `im:history`, `channels:history`,
// `groups:history`) stored in SLACK_USER_TOKEN. SLACK_BRIEFING_CHANNEL is
// the channel/DM id to read (e.g. `D0ASXK77QCR`).

type SlackMessage = {
  ts: string;
  user?: string;
  bot_id?: string;
  text?: string;
  blocks?: Array<{ type: string; text?: { text?: string }; elements?: unknown[] }>;
  attachments?: Array<{ text?: string; fallback?: string; title?: string }>;
};

function flattenBlocks(blocks: SlackMessage["blocks"]): string {
  if (!blocks) return "";
  const out: string[] = [];
  const walk = (n: unknown) => {
    if (!n || typeof n !== "object") return;
    const anyN = n as Record<string, unknown>;
    if (typeof anyN.text === "string") out.push(anyN.text);
    if (anyN.text && typeof anyN.text === "object") {
      const t = (anyN.text as Record<string, unknown>).text;
      if (typeof t === "string") out.push(t);
    }
    for (const v of Object.values(anyN)) {
      if (Array.isArray(v)) v.forEach(walk);
      else if (v && typeof v === "object") walk(v);
    }
  };
  blocks.forEach(walk);
  return out.join("\n");
}

function messageToText(m: SlackMessage): string {
  const parts: string[] = [];
  if (m.text) parts.push(m.text);
  const blockText = flattenBlocks(m.blocks);
  if (blockText) parts.push(blockText);
  for (const a of m.attachments ?? []) {
    if (a.title) parts.push(a.title);
    if (a.text) parts.push(a.text);
    else if (a.fallback) parts.push(a.fallback);
  }
  return parts.join("\n").trim();
}

export type FetchResult =
  | { ok: true; ts: string; text: string }
  | { ok: false; reason: string };

export async function fetchLatestBriefing(): Promise<FetchResult> {
  const token = process.env.SLACK_USER_TOKEN;
  const channel = process.env.SLACK_BRIEFING_CHANNEL;
  if (!token) return { ok: false, reason: "SLACK_USER_TOKEN not set" };
  if (!channel) return { ok: false, reason: "SLACK_BRIEFING_CHANNEL not set" };

  const url = new URL("https://slack.com/api/conversations.history");
  url.searchParams.set("channel", channel);
  url.searchParams.set("limit", "25");
  url.searchParams.set("include_all_metadata", "true");
  const res = await fetch(url, {
    headers: { authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) return { ok: false, reason: `slack_http_${res.status}` };
  const data = await res.json();
  if (!data.ok) return { ok: false, reason: `slack_${data.error ?? "unknown"}` };

  const messages = (data.messages ?? []) as SlackMessage[];
  // Find the first message from a bot (skip the user's own replies) that has
  // at least a few lines of content — the daily briefing post.
  for (const m of messages) {
    if (!m.bot_id) continue;
    const text = messageToText(m);
    if (text.length < 80) continue;
    return { ok: true, ts: m.ts, text };
  }
  return { ok: false, reason: "no_bot_message_found" };
}
