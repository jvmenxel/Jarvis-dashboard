import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { clerkEnabled } from "@/lib/auth";
import { hasAnyProvider } from "@/lib/ai";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  const [recentUsage, totalTokens] = await Promise.all([
    prisma.usageEvent.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    prisma.usageEvent.aggregate({
      where: { userId: user.id },
      _sum: { tokensIn: true, tokensOut: true },
    }),
  ]);

  const provider = process.env.AI_DEFAULT_PROVIDER ?? "anthropic";
  const model = process.env.AI_DEFAULT_MODEL ?? "claude-haiku-4-5";
  const history = process.env.AI_MAX_HISTORY_MESSAGES ?? "8";
  const memory = process.env.AI_MAX_MEMORY_ITEMS ?? "4";

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-fg-muted">
          Status of the environment, auth, and AI layer. All secrets live in
          <code className="text-accent mx-1">.env</code>.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle>Authentication</CardTitle></CardHeader>
          <CardBody className="pt-0 space-y-2 text-sm">
            <Row
              label="Clerk"
              value={
                clerkEnabled ? (
                  <Badge tone="ok">connected</Badge>
                ) : (
                  <Badge tone="warn">dev mode</Badge>
                )
              }
            />
            <Row label="User" value={user.name ?? user.email ?? "Dev User"} />
            <Row label="Email" value={user.email ?? "—"} />
            <Row label="Internal id" value={<code className="text-xs">{user.id}</code>} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader><CardTitle>AI provider</CardTitle></CardHeader>
          <CardBody className="pt-0 space-y-2 text-sm">
            <Row
              label="Status"
              value={
                hasAnyProvider() ? (
                  <Badge tone="ok">live</Badge>
                ) : (
                  <Badge tone="warn">local fallback</Badge>
                )
              }
            />
            <Row label="Default provider" value={provider} />
            <Row label="Default model" value={<code className="text-xs">{model}</code>} />
            <Row label="History window" value={`${history} messages`} />
            <Row label="Memory retrieval" value={`top ${memory} items`} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader><CardTitle>Database</CardTitle></CardHeader>
          <CardBody className="pt-0 space-y-2 text-sm">
            <Row label="Driver" value="SQLite (Prisma)" />
            <Row
              label="URL"
              value={<code className="text-xs">{process.env.DATABASE_URL}</code>}
            />
            <Row label="Deploy target" value="Vercel + swap to Postgres when ready" />
          </CardBody>
        </Card>

        <Card>
          <CardHeader><CardTitle>Token usage</CardTitle></CardHeader>
          <CardBody className="pt-0 space-y-2 text-sm">
            <Row
              label="Total tokens in"
              value={totalTokens._sum.tokensIn ?? 0}
            />
            <Row
              label="Total tokens out"
              value={totalTokens._sum.tokensOut ?? 0}
            />
            <div className="pt-2 text-[11px] text-fg-subtle">
              Deterministic shortcuts never spend tokens. The assistant only
              calls a model when the intent router cannot resolve a turn locally.
            </div>
          </CardBody>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader><CardTitle>Recent model calls</CardTitle></CardHeader>
          <CardBody className="pt-0">
            {recentUsage.length === 0 ? (
              <div className="py-8 text-center text-sm text-fg-subtle">
                No model calls yet.
              </div>
            ) : (
              <ul className="divide-y divide-border/60 text-xs">
                {recentUsage.map((u) => (
                  <li key={u.id} className="py-2 flex items-center gap-3">
                    <Badge tone={u.provider === "local" ? "default" : "accent"}>
                      {u.provider ?? "—"}
                    </Badge>
                    <span className="text-fg-muted flex-1 truncate">
                      {u.model ?? "—"}
                    </span>
                    <span className="text-fg-subtle">
                      in {u.tokensIn} · out {u.tokensOut}
                    </span>
                    <span className="text-fg-subtle">
                      {new Date(u.createdAt).toLocaleString()}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader><CardTitle>Deployment readiness</CardTitle></CardHeader>
          <CardBody className="pt-0 space-y-2 text-sm">
            <Row
              label="Local dev server"
              value={<Badge tone="ok">npm run dev</Badge>}
            />
            <Row
              label="Build"
              value={<Badge tone="ok">npm run build</Badge>}
            />
            <Row
              label="Vercel env vars"
              value={
                <span className="text-fg-muted">
                  Set <code>DATABASE_URL</code>, optionally <code>CLERK_SECRET_KEY</code>,{" "}
                  <code>NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY</code>,{" "}
                  <code>ANTHROPIC_API_KEY</code> / <code>OPENAI_API_KEY</code>.
                </span>
              }
            />
            <Row
              label="Apple / voice"
              value={<span className="text-fg-muted">Placeholder — phase 4.</span>}
            />
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-1">
      <span className="text-fg-subtle">{label}</span>
      <span className="text-right">{value}</span>
    </div>
  );
}
