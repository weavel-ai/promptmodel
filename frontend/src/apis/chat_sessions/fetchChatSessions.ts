import { webServerClient } from "@/apis/base";
import { ChatSession, ReadChatSessionsRequest } from "@/types/ChatSession";

/**
 * Reads a ChatModelVersion's ChatLogSessions.
 * @param requestData - The data required to fetch ChatLogSessions.
 * @returns A promise that resolves to a list of the ChatLogSession interface.
 */
export async function fetchChatSessions(
  requestData: ReadChatSessionsRequest
): Promise<Array<ChatSession>> {
  const response = await webServerClient.get("/chat_sessions", {
    params: requestData,
  });
  return response.data;
}
