import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import {
  formatDistanceToNow,
  format,
  isToday,
  isTomorrow,
  isYesterday,
  differenceInDays,
} from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatRelative(d: Date | string | null | undefined) {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  if (isToday(date)) return `Today ${format(date, "HH:mm")}`;
  if (isTomorrow(date)) return `Tomorrow ${format(date, "HH:mm")}`;
  if (isYesterday(date)) return `Yesterday ${format(date, "HH:mm")}`;
  const days = differenceInDays(date, new Date());
  if (Math.abs(days) < 7) return format(date, "EEE HH:mm");
  return format(date, "MMM d, yyyy");
}

export function formatAgo(d: Date | string | null | undefined) {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  return formatDistanceToNow(date, { addSuffix: true });
}

// Naive keyword scorer — deterministic, no model calls.
export function scoreRelevance(query: string, text: string): number {
  const q = query.toLowerCase();
  const t = text.toLowerCase();
  if (!q) return 0;
  let score = 0;
  for (const token of q.split(/\s+/).filter((x) => x.length >= 3)) {
    if (t.includes(token)) score += 1;
  }
  return score;
}
