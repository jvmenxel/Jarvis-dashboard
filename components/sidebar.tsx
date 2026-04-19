"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  MessagesSquare,
  ListChecks,
  NotebookPen,
  Brain,
  Workflow,
  Settings,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/chat", label: "Assistant", icon: MessagesSquare },
  { href: "/tasks", label: "Tasks", icon: ListChecks },
  { href: "/notes", label: "Notes", icon: NotebookPen },
  { href: "/memory", label: "Memory", icon: Brain },
  { href: "/automations", label: "Automations", icon: Workflow },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="hidden md:flex w-60 shrink-0 flex-col gap-1 border-r border-border bg-panel/60 px-3 py-5">
      <div className="px-3 pb-6 flex items-center gap-2">
        <div className="size-8 rounded-lg bg-gradient-to-br from-accent to-accent-strong flex items-center justify-center shadow-sm">
          <Sparkles className="size-4 text-black" />
        </div>
        <div className="leading-tight">
          <div className="text-sm font-semibold tracking-wide">JARVIS</div>
          <div className="text-[11px] text-fg-subtle">executive assistant</div>
        </div>
      </div>
      <nav className="flex flex-col gap-0.5">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname?.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-accent/10 text-accent"
                  : "text-fg-muted hover:text-fg hover:bg-panel"
              )}
            >
              <Icon
                className={cn(
                  "size-4",
                  active ? "text-accent" : "text-fg-subtle group-hover:text-fg"
                )}
              />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto px-3 pt-6 text-[11px] text-fg-subtle">
        <div className="flex items-center gap-1.5">
          <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
          system nominal
        </div>
      </div>
    </aside>
  );
}
