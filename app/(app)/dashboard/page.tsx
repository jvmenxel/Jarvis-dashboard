import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getCurrentUserId } from "@/lib/auth";
import { getDashboardSummary } from "@/lib/tools";
import { formatRelative, formatAgo } from "@/lib/utils";
import Link from "next/link";
import { ArrowRight, CheckCircle2, ListChecks, NotebookPen, Brain, MessagesSquare } from "lucide-react";
import { prisma } from "@/lib/db";
import { parseSections, todayKey } from "@/lib/briefings";
import { BriefingCard } from "@/components/briefing/BriefingCard";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const userId = await getCurrentUserId();
  const [summary, briefingRow] = await Promise.all([
    getDashboardSummary(userId),
    prisma.briefing.findUnique({
      where: { userId_date: { userId, date: todayKey() } },
    }),
  ]);
  const { openTasks, doneToday, recentNotes, recentChats, recentMemories } = summary;
  const briefing = briefingRow
    ? {
        id: briefingRow.id,
        date: briefingRow.date,
        source: briefingRow.source,
        sections: parseSections(briefingRow.sections),
        updatedAt: briefingRow.updatedAt.toISOString(),
      }
    : null;
  const slackConfigured = Boolean(
    process.env.SLACK_USER_TOKEN && process.env.SLACK_BRIEFING_CHANNEL
  );

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-6">
      <BriefingCard initial={briefing} slackConfigured={slackConfigured} />
      {/* Stats row */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat icon={<ListChecks className="size-4" />} label="Open tasks" value={openTasks.length} href="/tasks" />
        <Stat icon={<CheckCircle2 className="size-4" />} label="Done today" value={doneToday} href="/tasks?status=done" />
        <Stat icon={<NotebookPen className="size-4" />} label="Notes" value={recentNotes.length} href="/notes" />
        <Stat icon={<Brain className="size-4" />} label="Memory items" value={recentMemories} href="/memory" />
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tasks */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex items-center justify-between">
            <CardTitle>Today</CardTitle>
            <Link href="/tasks" className="text-xs text-accent hover:underline inline-flex items-center gap-1">
              Tasks <ArrowRight className="size-3" />
            </Link>
          </CardHeader>
          <CardBody className="pt-0">
            {openTasks.length === 0 ? (
              <Empty label="No open tasks. A rare moment of calm." />
            ) : (
              <ul className="divide-y divide-border/60">
                {openTasks.map((t) => (
                  <li key={t.id} className="flex items-center gap-3 py-2.5">
                    <span
                      className={
                        t.priority === "high"
                          ? "size-2 rounded-full bg-red-400"
                          : t.priority === "low"
                            ? "size-2 rounded-full bg-zinc-500"
                            : "size-2 rounded-full bg-accent"
                      }
                    />
                    <span className="flex-1 text-sm">{t.title}</span>
                    {t.dueAt && (
                      <span className="text-xs text-fg-subtle">{formatRelative(t.dueAt)}</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        {/* Quick actions */}
        <Card>
          <CardHeader><CardTitle>Quick actions</CardTitle></CardHeader>
          <CardBody className="pt-0 grid grid-cols-1 gap-2">
            <QuickAction href="/chat" icon={<MessagesSquare className="size-4" />} label="Open assistant" />
            <QuickAction href="/tasks" icon={<ListChecks className="size-4" />} label="Add a task" />
            <QuickAction href="/notes" icon={<NotebookPen className="size-4" />} label="Write a note" />
            <QuickAction href="/memory" icon={<Brain className="size-4" />} label="Save to memory" />
          </CardBody>
        </Card>

        {/* Recent notes */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex items-center justify-between">
            <CardTitle>Recent notes</CardTitle>
            <Link href="/notes" className="text-xs text-accent hover:underline inline-flex items-center gap-1">
              All notes <ArrowRight className="size-3" />
            </Link>
          </CardHeader>
          <CardBody className="pt-0">
            {recentNotes.length === 0 ? (
              <Empty label="No notes yet — jot down something." />
            ) : (
              <ul className="space-y-3">
                {recentNotes.map((n) => (
                  <li key={n.id} className="rounded-lg border border-border/60 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-medium text-sm">{n.title}</div>
                      <div className="text-[11px] text-fg-subtle">{formatAgo(n.updatedAt)}</div>
                    </div>
                    <p className="mt-1 text-xs text-fg-muted line-clamp-2">{n.body}</p>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        {/* Recent conversations */}
        <Card>
          <CardHeader className="flex items-center justify-between">
            <CardTitle>Recent chats</CardTitle>
            <Link href="/chat" className="text-xs text-accent hover:underline inline-flex items-center gap-1">
              Assistant <ArrowRight className="size-3" />
            </Link>
          </CardHeader>
          <CardBody className="pt-0">
            {recentChats.length === 0 ? (
              <Empty label="No conversations yet." />
            ) : (
              <ul className="space-y-3">
                {recentChats.map((c) => (
                  <li key={c.id} className="rounded-lg border border-border/60 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-sm font-medium truncate">{c.title ?? "Untitled"}</div>
                      <Badge tone="accent">{c.messages.length > 0 ? "active" : "new"}</Badge>
                    </div>
                    {c.messages[0] && (
                      <p className="mt-1 text-xs text-fg-muted line-clamp-2">
                        {c.messages[0].content}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-2xl border border-border bg-panel/80 px-5 py-4 flex items-center justify-between hover:border-accent/40 transition-colors"
    >
      <div className="flex flex-col">
        <div className="text-xs uppercase tracking-wide text-fg-subtle">{label}</div>
        <div className="text-2xl font-semibold mt-1">{value}</div>
      </div>
      <div className="size-9 rounded-lg bg-accent/10 text-accent flex items-center justify-center group-hover:bg-accent/20">
        {icon}
      </div>
    </Link>
  );
}

function QuickAction({
  href,
  icon,
  label,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-lg border border-border px-3 py-2 text-sm hover:border-accent/40 hover:bg-panel"
    >
      <span className="text-accent">{icon}</span>
      <span>{label}</span>
      <ArrowRight className="size-3 ml-auto text-fg-subtle" />
    </Link>
  );
}

function Empty({ label }: { label: string }) {
  return <div className="py-8 text-center text-sm text-fg-subtle">{label}</div>;
}
