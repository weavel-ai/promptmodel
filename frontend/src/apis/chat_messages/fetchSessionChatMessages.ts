import { railwayWebClient } from "@/apis/base";
import {
  ChatMessage,
  ReadSessionChatMessagesRequest,
} from "@/types/ChatMessage";

/**
 * Reads a ChatModelVersion's ChatMessageSessions.
 * @param requestData - The data required to fetch ChatMessageSessions.
 * @returns A promise that resolves to a list of the ChatMessageSession interface.
 */
export async function fetchSessionChatMessages(
  requestData: ReadSessionChatMessagesRequest
): Promise<Array<ChatMessage>> {
  const response = await railwayWebClient.get("/chat_messages/session", {
    params: requestData,
  });
  return response.data;
}
