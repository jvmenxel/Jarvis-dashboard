import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

type Tone = "default" | "accent" | "ok" | "warn" | "danger";

const tones: Record<Tone, string> = {
  default: "border-border bg-panel text-fg-muted",
  accent: "border-accent/30 bg-accent/10 text-accent",
  ok: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
  warn: "border-amber-500/30 bg-amber-500/10 text-amber-400",
  danger: "border-red-500/30 bg-red-500/10 text-red-400",
};

type Props = HTMLAttributes<HTMLSpanElement> & { tone?: Tone };

export function Badge({ className, tone = "default", ...props }: Props) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium tracking-wide",
        tones[tone],
        className
      )}
      {...props}
    />
  );
}
