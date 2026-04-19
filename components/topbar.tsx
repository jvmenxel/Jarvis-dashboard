import { clerkEnabled } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";

type Props = {
  user: { name: string | null; email: string | null; isDev: boolean };
};

export async function Topbar({ user }: Props) {
  const greeting = greet();
  let userChip: React.ReactNode = null;
  if (clerkEnabled) {
    const { UserButton } = await import("@clerk/nextjs");
    userChip = <UserButton appearance={{ elements: { avatarBox: "size-8" } }} />;
  } else {
    userChip = (
      <div className="flex items-center gap-2 text-sm">
        <Badge tone="warn">dev mode</Badge>
        <span className="text-fg-muted">{user.name ?? "You"}</span>
      </div>
    );
  }
  return (
    <header className="flex items-center justify-between border-b border-border px-6 py-3 bg-panel/40 backdrop-blur-sm">
      <div className="flex flex-col">
        <div className="text-xs text-fg-subtle uppercase tracking-widest">
          {greeting}
        </div>
        <div className="text-sm text-fg">
          {user.name ? `Welcome back, ${user.name.split(" ")[0]}.` : "Welcome back."}
        </div>
      </div>
      <div>{userChip}</div>
    </header>
  );
}

function greet() {
  const h = new Date().getHours();
  if (h < 5) return "Late hours";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  if (h < 21) return "Good evening";
  return "Good night";
}
