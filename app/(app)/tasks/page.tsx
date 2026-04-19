import { getCurrentUserId } from "@/lib/auth";
import { listTasks } from "@/lib/tools";
import { TasksClient } from "./TasksClient";

export const dynamic = "force-dynamic";

export default async function TasksPage() {
  const userId = await getCurrentUserId();
  const tasks = await listTasks(userId, { limit: 200 });
  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto">
      <TasksClient initialTasks={JSON.parse(JSON.stringify(tasks))} />
    </div>
  );
}
