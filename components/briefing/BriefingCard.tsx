"use client";

import { useState, useTransition } from "react";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatAgo } from "@/lib/utils";
import {
  CalendarClock,
  TrendingUp,
  TrendingDown,
  Minus,
  Sparkles,
  RefreshCcw,
  ClipboardPaste,
  CheckCircle2,
  Zap,
} from "lucide-react";
import type { BriefingSections } from "@/lib/briefings";

type Briefing = {
  id: string;
  date: string;
  source: string;
  sections: BriefingSections;
  updatedAt: string;
} | null;

export function BriefingCard({
  initial,
  slackConfigured,
}: {
  initial: Briefing;
  slackConfigured: boolean;
}) {
  const [briefing, setBriefing] = useState<Briefing>(initial);
  const [mode, setMode] = useState<"view" | "paste">(
    initial ? "view" : "paste"
  );
  const [raw, setRaw] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function savePaste() {
    if (raw.trim().length < 10) {
      setStatus("Too short to parse.");
      return;
    }
    start(async () => {
      setStatus("Parsing…");
      const res = await fetch("/api/briefings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ raw, source: "manual" }),
      });
      if (!res.ok) {
        setStatus("Save failed.");
        return;
      }
      const data = await res.json();
      setBriefing(data.briefing);
      setStatus(null);
      setMode("view");
      setRaw("");
    });
  }

  function refreshFromSlack() {
    start(async () => {
      setStatus("Pulling from Slack…");
      const res = await fetch("/api/briefings/slack", { method: "POST" });
      const data = await res.json();
      if (!data.ok) {
        setStatus(`Slack: ${data.reason ?? "failed"}`);
        return;
      }
      const g = await fetch("/api/briefings");
      const gdata = await g.json();
      setBriefing(gdata.briefing);
      setStatus(data.reused ? "No new briefing — kept existing." : "Updated.");
    });
  }

  const s = briefing?.sections ?? {};
  const hasAnySection =
    (s.agenda?.length ?? 0) +
      (s.pipeline?.length ?? 0) +
      (s.highlights?.length ?? 0) +
      (s.actions?.length ?? 0) >
    0;

  return (
    <Card className="border-accent/30 bg-gradient-to-br from-panel to-panel-elevated">
      <CardBody className="py-5 space-y-4">
        <header className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="size-9 rounded-lg bg-accent/15 text-accent flex items-center justify-center shrink-0">
              <Sparkles className="size-4" />
            </div>
            <div>
              <div className="text-xs uppercase tracking-widest text-fg-subtle">
                Daily briefing
              </div>
              <h2 className="text-lg font-semibold mt-0.5">
                {s.headline ?? (briefing ? "Today" : "No briefing yet")}
              </h2>
              {briefing && (
                <div className="mt-1 flex items-center gap-2 text-[11px] text-fg-subtle">
                  <Badge tone="accent">{briefing.source}</Badge>
                  <span>updated {formatAgo(briefing.updatedAt)}</span>
                </div>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            {slackConfigured && (
              <Button
                size="sm"
                variant="secondary"
                onClick={refreshFromSlack}
                disabled={pending}
                title="Pull the latest Cowork message from Slack"
              >
                <RefreshCcw className="size-3.5" /> Slack
              </Button>
            )}
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setMode(mode === "paste" ? "view" : "paste")}
            >
              <ClipboardPaste className="size-3.5" /> Paste
            </Button>
          </div>
        </header>

        {status && (
          <div className="text-xs text-fg-muted">{status}</div>
        )}

        {mode === "paste" ? (
          <div className="space-y-2">
            <Textarea
              rows={8}
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
              placeholder="Paste your Cowork morning briefing here — agenda, pipeline, anything. Jarvis will structure it."
            />
            <div className="flex justify-end gap-2">
              <Button
                size="sm"
                onClick={() => {
                  setMode("view");
                  setRaw("");
                  setStatus(null);
                }}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                variant="primary"
                onClick={savePaste}
                disabled={pending}
              >
                Save briefing
              </Button>
            </div>
          </div>
        ) : !briefing ? (
          <EmptyHint slackConfigured={slackConfigured} />
        ) : !hasAnySection ? (
          <div className="text-sm text-fg-muted whitespace-pre-wrap">
            {/* Fall back to raw text if parse returned nothing useful */}
            No structured sections parsed — showing raw below.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {s.agenda && s.agenda.length > 0 && (
              <Section title="Agenda" icon={<CalendarClock className="size-4" />}>
                <ul className="space-y-1.5 text-sm">
                  {s.agenda.map((a, i) => (
                    <li key={i} className="flex items-start gap-2">
                      {a.time && (
                        <span className="text-xs text-accent font-mono shrink-0 w-14">
                          {a.time}
                        </span>
                      )}
                      <span className="flex-1">
                        <span className="text-fg">{a.title}</span>
                        {a.note && (
                          <span className="text-fg-subtle"> — {a.note}</span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              </Section>
            )}
            {s.pipeline && s.pipeline.length > 0 && (
              <Section title="Pipeline" icon={<TrendingUp className="size-4" />}>
                <ul className="space-y-1.5 text-sm">
                  {s.pipeline.map((p, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <TrendIcon trend={p.trend} />
                      <span className="flex-1">
                        <span className="text-fg">{p.label}</span>
                        {p.value && (
                          <span className="text-accent font-mono ml-1">{p.value}</span>
                        )}
                        {p.note && (
                          <span className="text-fg-subtle block text-xs mt-0.5">
                            {p.note}
                          </span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              </Section>
            )}
            {s.highlights && s.highlights.length > 0 && (
              <Section title="Highlights" icon={<Zap className="size-4" />}>
                <ul className="space-y-1 text-sm">
                  {s.highlights.map((h, i) => (
                    <li key={i} className="text-fg-muted">
                      • {h}
                    </li>
                  ))}
                </ul>
              </Section>
            )}
            {s.actions && s.actions.length > 0 && (
              <Section title="Actions" icon={<CheckCircle2 className="size-4" />}>
                <ul className="space-y-1 text-sm">
                  {s.actions.map((a, i) => (
                    <li key={i} className="text-fg">
                      → {a}
                    </li>
                  ))}
                </ul>
              </Section>
            )}
          </div>
        )}
      </CardBody>
    </Card>
  );
}

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border/60 p-3">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-fg-subtle mb-2">
        <span className="text-accent">{icon}</span>
        {title}
      </div>
      {children}
    </div>
  );
}

function TrendIcon({ trend }: { trend?: "up" | "down" | "flat" }) {
  if (trend === "up") return <TrendingUp className="size-4 text-emerald-400 shrink-0 mt-0.5" />;
  if (trend === "down") return <TrendingDown className="size-4 text-red-400 shrink-0 mt-0.5" />;
  return <Minus className="size-4 text-fg-subtle shrink-0 mt-0.5" />;
}

function EmptyHint({ slackConfigured }: { slackConfigured: boolean }) {
  return (
    <div className="text-sm text-fg-muted space-y-2">
      <p>
        No briefing yet for today. {slackConfigured ? "Hit " : "Set up a Slack pull in Settings, or hit "}
        <span className="text-fg">Paste</span>
        {slackConfigured ? " Slack to pull the latest from Cowork, or paste it manually." : " and drop in your morning briefing."}
      </p>
    </div>
  );
}
