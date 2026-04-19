import { getCurrentUserId } from "@/lib/auth";
import { listNotes } from "@/lib/tools";
import { NotesClient } from "./NotesClient";

export const dynamic = "force-dynamic";

export default async function NotesPage() {
  const userId = await getCurrentUserId();
  const notes = await listNotes(userId, { limit: 200 });
  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto">
      <NotesClient initialNotes={JSON.parse(JSON.stringify(notes))} />
    </div>
  );
}
