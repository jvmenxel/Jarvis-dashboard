import { getCurrentUserId } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { AutomationsClient } from "./AutomationsClient";

export const dynamic = "force-dynamic";

export default async function AutomationsPage() {
  const userId = await getCurrentUserId();
  const workflows = await prisma.workflow.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    include: { runs: { orderBy: { startedAt: "desc" }, take: 5 } },
  });
  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto">
      <AutomationsClient initial={JSON.parse(JSON.stringify(workflows))} />
    </div>
  );
}
