import { railwayWebClient } from "@/apis/base";
import { ChatLog, ReadSessionChatLogsRequest } from "@/types/ChatLog";

/**
 * Reads a ChatModelVersion's ChatLogSessions.
 * @param requestData - The data required to fetch ChatLogSessions.
 * @returns A promise that resolves to a list of the ChatLogSession interface.
 */
export async function fetchSessionChatLogs(
  requestData: ReadSessionChatLogsRequest
): Promise<Array<ChatLog>> {
  const response = await railwayWebClient.get("/chat_logs/session", {
    params: requestData,
  });
  return response.data;
}
