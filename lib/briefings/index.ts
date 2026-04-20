// Daily briefing ingest + parser.
//
// Accepts raw text from any source (manual paste, Slack pull, webhook, cron)
// and stores one row per user per day. A small Haiku call turns the raw text
// into a structured shape the dashboard renders; we cache aggressively so
// the model is only hit when the raw text actually changes.

import { prisma } from "@/lib/db";
import { generate } from "@/lib/ai";
import { z } from "zod";

export type BriefingSections = {
  headline?: string;
  agenda?: { time?: string; title: string; note?: string }[];
  pipeline?: { label: string; value?: string; trend?: "up" | "down" | "flat"; note?: string }[];
  highlights?: string[];
  actions?: string[];
};

export const IngestInput = z.object({
  raw: z.string().min(10).max(20000),
  source: z.enum(["manual", "slack", "webhook", "cron"]).default("manual"),
  sourceRef: z.string().max(200).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export function todayKey(now: Date = new Date()) {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// Upsert today's (or given date's) briefing. If the same sourceRef is
// already stored for today, return the existing row unchanged — keeps the
// Slack cron idempotent.
export async function ingestBriefing(
  userId: string,
  input: z.infer<typeof IngestInput>
) {
  const date = input.date ?? todayKey();
  const existing = await prisma.briefing.findUnique({
    where: { userId_date: { userId, date } },
  });
  if (
    existing &&
    input.sourceRef &&
    existing.sourceRef === input.sourceRef &&
    existing.raw.length > 10
  ) {
    return { briefing: existing, reused: true };
  }

  const sections = await parseBriefing(userId, input.raw);

  const saved = await prisma.briefing.upsert({
    where: { userId_date: { userId, date } },
    create: {
      userId,
      date,
      source: input.source,
      sourceRef: input.sourceRef,
      raw: input.raw,
      sections: JSON.stringify(sections),
    },
    update: {
      source: input.source,
      sourceRef: input.sourceRef,
      raw: input.raw,
      sections: JSON.stringify(sections),
    },
  });
  return { briefing: saved, reused: false };
}

// Strip Slack window chrome and isolate the most recent briefing. Users who
// ⌘A an entire Slack window paste in sidebar labels, search placeholders,
// multiple past briefings, and the input field. We want just today's.
export function extractLatestBriefing(raw: string): string {
  const text = raw.replace(/\r\n/g, "\n");

  // Known end-of-briefing markers from Cowork.
  const endMarkers = [
    "Briefing generated automatically by Claude",
    "Sent using @Claude",
  ];
  let endIdx = text.length;
  for (const m of endMarkers) {
    const i = text.lastIndexOf(m);
    if (i !== -1 && i < endIdx) endIdx = i + m.length;
  }

  // Start markers — prefer the most recent one before endIdx.
  const startMarkers = [
    /Good morning,?\s+\w+/gi,
    /Here'?s your briefing/gi,
    /Morning Briefing\b/gi,
  ];
  let startIdx = -1;
  for (const rx of startMarkers) {
    let m: RegExpExecArray | null;
    while ((m = rx.exec(text)) !== null) {
      if (m.index < endIdx && m.index > startIdx) startIdx = m.index;
    }
  }
  if (startIdx === -1) return raw.trim(); // no markers → leave as-is
  return text.slice(startIdx, endIdx).trim();
}

// Turn raw briefing text into {agenda, pipeline, highlights, actions}.
// Uses Claude Haiku. If no provider is configured we fall back to a
// deterministic heuristic so the dashboard still shows something useful.
export async function parseBriefing(
  userId: string,
  raw: string
): Promise<BriefingSections> {
  const cleaned = extractLatestBriefing(raw);
  if (!process.env.ANTHROPIC_API_KEY && !process.env.OPENAI_API_KEY) {
    return heuristicParse(cleaned);
  }
  const system = [
    "You turn a morning executive-assistant briefing into strict JSON.",
    "Return ONLY JSON (no prose) with this exact shape:",
    `{"headline": string, "agenda": [{"time": string, "title": string, "note": string}], "pipeline": [{"label": string, "value": string, "trend": "up"|"down"|"flat", "note": string}], "highlights": [string], "actions": [string]}`,
    "Rules:",
    "- Omit any section that truly doesn't apply (use an empty array).",
    "- Keep every string under 140 characters.",
    "- Agenda items come from meetings/calendar. Pipeline items come from deal / forecast / revenue numbers.",
    "- Highlights = important non-meeting context; actions = things the user should do today.",
    "- Do NOT invent data. If the input has no pipeline info, return an empty pipeline array.",
  ].join("\n");

  const result = await generate({
    userId,
    size: "small",
    system,
    messages: [{ role: "user", content: cleaned.slice(0, 6000) }],
    maxOutputTokens: 700,
  });

  const parsed = tryJson(result.content);
  if (!parsed) return heuristicParse(cleaned);
  return sanitize(parsed);
}

function tryJson(s: string): unknown {
  const trimmed = s.trim().replace(/^```(?:json)?|```$/g, "").trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const m = trimmed.match(/\{[\s\S]*\}/);
    if (!m) return null;
    try {
      return JSON.parse(m[0]);
    } catch {
      return null;
    }
  }
}

function sanitize(v: unknown): BriefingSections {
  const obj = (v ?? {}) as Record<string, unknown>;
  const asStrList = (x: unknown) =>
    Array.isArray(x) ? x.filter((i) => typeof i === "string").slice(0, 12) : [];
  const asObjList = (x: unknown) =>
    Array.isArray(x)
      ? x
          .filter((i) => i && typeof i === "object")
          .map((i) => i as Record<string, unknown>)
          .slice(0, 12)
      : [];

  return {
    headline: typeof obj.headline === "string" ? obj.headline.slice(0, 200) : undefined,
    agenda: asObjList(obj.agenda).map((i) => ({
      time: typeof i.time === "string" ? i.time.slice(0, 40) : undefined,
      title: (typeof i.title === "string" ? i.title : "").slice(0, 200),
      note: typeof i.note === "string" ? i.note.slice(0, 200) : undefined,
    })),
    pipeline: asObjList(obj.pipeline).map((i) => ({
      label: (typeof i.label === "string" ? i.label : "").slice(0, 100),
      value: typeof i.value === "string" ? i.value.slice(0, 60) : undefined,
      trend: i.trend === "up" || i.trend === "down" || i.trend === "flat" ? i.trend : undefined,
      note: typeof i.note === "string" ? i.note.slice(0, 200) : undefined,
    })),
    highlights: asStrList(obj.highlights),
    actions: asStrList(obj.actions),
  };
}

// Zero-model fallback: split raw into headline + bullet-ish highlights.
function heuristicParse(raw: string): BriefingSections {
  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const headline = lines[0]?.replace(/^#+\s*/, "").slice(0, 200);
  const bullets = lines
    .filter((l) => /^[-*•·]|^\d+\./.test(l))
    .map((l) => l.replace(/^[-*•·\d.\s]+/, "").trim())
    .filter(Boolean)
    .slice(0, 8);
  return {
    headline,
    agenda: [],
    pipeline: [],
    highlights: bullets,
    actions: [],
  };
}

export function parseSections(raw: string | null | undefined): BriefingSections {
  if (!raw) return {};
  try {
    return sanitize(JSON.parse(raw));
  } catch {
    return {};
  }
}
