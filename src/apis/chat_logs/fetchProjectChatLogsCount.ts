import { railwayWebClient } from "@/apis/base";
import {
  ReadProjectChatLogsCountRequest,
  ReadProjectChatLogsCountResponse,
} from "@/types/ChatLog";

/**
 * Reads a Project's ChatLogs count.
 * @param requestData - The data required to fetch ChatLogs count.
 * @returns A promise that resolves to a ChatLogs count response interface.
 */
export async function fetchProjectChatLogsCount(
  requestData: ReadProjectChatLogsCountRequest
): Promise<ReadProjectChatLogsCountResponse> {
  const response = await railwayWebClient.get("/chat_logs/count", {
    params: requestData,
  });
  return response.data;
}
