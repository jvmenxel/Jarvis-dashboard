import { getCurrentUserId } from "@/lib/auth";
import { listMemory } from "@/lib/tools";
import { MemoryClient } from "./MemoryClient";

export const dynamic = "force-dynamic";

export default async function MemoryPage() {
  const userId = await getCurrentUserId();
  const items = await listMemory(userId, { limit: 500 });
  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto">
      <MemoryClient initial={JSON.parse(JSON.stringify(items))} />
    </div>
  );
}
