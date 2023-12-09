import { railwayWebClient } from "@/apis/base";
import { ChatLogView, ReadProjectChatLogsRequest } from "@/types/ChatLog";

/**
 * Reads a Project's ChatLogSessions.
 * @param requestData - The data required to fetch ChatLogSessions.
 * @returns A promise that resolves to a list of the ChatLogSession interface.
 */
export async function fetchProjectChatLogs(
  requestData: ReadProjectChatLogsRequest
): Promise<Array<ChatLogView>> {
  const response = await railwayWebClient.get("/chat_logs/project", {
    params: requestData,
  });
  return response.data;
}
