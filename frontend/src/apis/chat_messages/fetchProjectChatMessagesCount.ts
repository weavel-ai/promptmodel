import { railwayWebClient } from "@/apis/base";
import {
  ReadProjectChatMessagesCountRequest,
  ReadProjectChatMessagesCountResponse,
} from "@/types/ChatMessage";

/**
 * Reads a Project's ChatMessages count.
 * @param requestData - The data required to fetch ChatMessages count.
 * @returns A promise that resolves to a ChatMessages count response interface.
 */
export async function fetchProjectChatMessagesCount(
  requestData: ReadProjectChatMessagesCountRequest
): Promise<ReadProjectChatMessagesCountResponse> {
  const response = await railwayWebClient.get("/chat_messages/count", {
    params: requestData,
  });
  return response.data;
}
