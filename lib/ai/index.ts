// Compact AI provider abstraction.
//
// The app calls `generate()` with a size class (small/medium/large). Each class
// maps to a default model; providers are swappable. If no API keys are set, we
// fall back to a deterministic local responder so the UI is always usable.

import { prisma } from "@/lib/db";

export type SizeClass = "small" | "medium" | "large";

export type ChatTurn = { role: "user" | "assistant" | "system"; content: string };

export type GenerateInput = {
  userId: string;
  size?: SizeClass;
  system?: string;
  messages: ChatTurn[];
  // Hard caps — the caller should already trim, but we enforce again here.
  maxOutputTokens?: number;
};

export type GenerateResult = {
  provider: "anthropic" | "openai" | "local";
  model: string;
  content: string;
  tokensIn: number;
  tokensOut: number;
};

const MODEL_BY_SIZE: Record<SizeClass, { anthropic: string; openai: string }> = {
  small: { anthropic: "claude-haiku-4-5", openai: "gpt-4o-mini" },
  medium: { anthropic: "claude-sonnet-4-6", openai: "gpt-4o" },
  large: { anthropic: "claude-opus-4-7", openai: "gpt-4o" },
};

const MAX_OUTPUT_BY_SIZE: Record<SizeClass, number> = {
  small: 400,
  medium: 800,
  large: 1500,
};

export function hasAnyProvider() {
  return Boolean(process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY);
}

export async function generate(input: GenerateInput): Promise<GenerateResult> {
  const size: SizeClass = input.size ?? "small";
  const maxOut = input.maxOutputTokens ?? MAX_OUTPUT_BY_SIZE[size];
  const provider = pickProvider();

  let result: GenerateResult;
  try {
    if (provider === "anthropic") {
      result = await callAnthropic(input, size, maxOut);
    } else if (provider === "openai") {
      result = await callOpenAI(input, size, maxOut);
    } else {
      result = localResponder(input);
    }
  } catch (err) {
    console.warn("[ai] provider call failed, falling back to local:", err);
    result = localResponder(input);
  }

  // Fire-and-forget usage log.
  prisma.usageEvent
    .create({
      data: {
        userId: input.userId,
        kind: "chat",
        provider: result.provider,
        model: result.model,
        tokensIn: result.tokensIn,
        tokensOut: result.tokensOut,
      },
    })
    .catch(() => {});

  return result;
}

function pickProvider(): "anthropic" | "openai" | "local" {
  const pref = (process.env.AI_DEFAULT_PROVIDER ?? "anthropic").toLowerCase();
  if (pref === "anthropic" && process.env.ANTHROPIC_API_KEY) return "anthropic";
  if (pref === "openai" && process.env.OPENAI_API_KEY) return "openai";
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  if (process.env.OPENAI_API_KEY) return "openai";
  return "local";
}

// ---- Anthropic ----
async function callAnthropic(
  input: GenerateInput,
  size: SizeClass,
  maxOut: number
): Promise<GenerateResult> {
  const model = process.env.AI_DEFAULT_MODEL || MODEL_BY_SIZE[size].anthropic;
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: maxOut,
      system: input.system,
      messages: input.messages.map((m) => ({ role: m.role, content: m.content })),
    }),
  });
  if (!res.ok) throw new Error(`anthropic_${res.status}`);
  const data = await res.json();
  const content =
    (data.content ?? [])
      .filter((c: { type: string }) => c.type === "text")
      .map((c: { text: string }) => c.text)
      .join("\n") || "";
  return {
    provider: "anthropic",
    model,
    content,
    tokensIn: data.usage?.input_tokens ?? 0,
    tokensOut: data.usage?.output_tokens ?? 0,
  };
}

// ---- OpenAI ----
async function callOpenAI(
  input: GenerateInput,
  size: SizeClass,
  maxOut: number
): Promise<GenerateResult> {
  const model = MODEL_BY_SIZE[size].openai;
  const messages = [
    ...(input.system ? [{ role: "system" as const, content: input.system }] : []),
    ...input.messages,
  ];
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${process.env.OPENAI_API_KEY!}`,
    },
    body: JSON.stringify({ model, max_tokens: maxOut, messages }),
  });
  if (!res.ok) throw new Error(`openai_${res.status}`);
  const data = await res.json();
  const content = data.choices?.[0]?.message?.content ?? "";
  return {
    provider: "openai",
    model,
    content,
    tokensIn: data.usage?.prompt_tokens ?? 0,
    tokensOut: data.usage?.completion_tokens ?? 0,
  };
}

// ---- Local fallback — deterministic, never fails, costs nothing ----
function localResponder(input: GenerateInput): GenerateResult {
  const last = [...input.messages].reverse().find((m) => m.role === "user");
  const q = (last?.content ?? "").trim();
  const reply = q
    ? `Local mode is active — I can still help you organize things.\n\n` +
      `You said: "${truncate(q, 160)}"\n\n` +
      `Hook up an ANTHROPIC_API_KEY or OPENAI_API_KEY in .env to enable real assistant replies. In the meantime, tasks, notes and memory all work fully.`
    : `Local mode is active. Add an AI provider key in .env to enable real replies.`;
  return {
    provider: "local",
    model: "local-fallback",
    content: reply,
    tokensIn: 0,
    tokensOut: 0,
  };
}

function truncate(s: string, n: number) {
  return s.length <= n ? s : s.slice(0, n - 1) + "…";
}
