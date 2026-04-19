import { getCurrentUserId } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { hasAnyProvider } from "@/lib/ai";
import { ChatClient } from "./ChatClient";

export const dynamic = "force-dynamic";

export default async function ChatPage() {
  const userId = await getCurrentUserId();
  const chats = await prisma.chat.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    take: 50,
  });
  const initialChat = chats[0] ?? null;
  const initialMessages = initialChat
    ? await prisma.message.findMany({
        where: { chatId: initialChat.id },
        orderBy: { createdAt: "asc" },
      })
    : [];
  return (
    <ChatClient
      initialChats={JSON.parse(JSON.stringify(chats))}
      initialChat={initialChat ? JSON.parse(JSON.stringify(initialChat)) : null}
      initialMessages={JSON.parse(JSON.stringify(initialMessages))}
      hasProvider={hasAnyProvider()}
    />
  );
}
