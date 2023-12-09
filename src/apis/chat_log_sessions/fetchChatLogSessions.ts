import { railwayWebClient } from "@/apis/base";
import {
  ChatLogSession,
  ReadChatLogSessionsRequest,
} from "@/types/ChatLogSession";

/**
 * Reads a ChatModelVersion's ChatLogSessions.
 * @param requestData - The data required to fetch ChatLogSessions.
 * @returns A promise that resolves to a list of the ChatLogSession interface.
 */
export async function fetchChatLogSessions(
  requestData: ReadChatLogSessionsRequest
): Promise<Array<ChatLogSession>> {
  const response = await railwayWebClient.get("/chat_log_sessions", {
    params: requestData,
  });
  return response.data;
}
