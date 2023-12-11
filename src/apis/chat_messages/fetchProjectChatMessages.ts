import { railwayWebClient } from "@/apis/base";
import { ChatLogView } from "@/types/ChatLogView";
import { ReadProjectChatMessagesRequest } from "@/types/ChatMessage";

/**
 * Reads a Project's ChatMessageSessions.
 * @param requestData - The data required to fetch ChatMessageSessions.
 * @returns A promise that resolves to a list of the ChatMessageSession interface.
 */
export async function fetchProjectChatMessages(
  requestData: ReadProjectChatMessagesRequest
): Promise<Array<ChatLogView>> {
  const response = await railwayWebClient.get("/chat_messages/project", {
    params: requestData,
  });
  return response.data;
}
