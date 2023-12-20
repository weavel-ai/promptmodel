import { webServerClient } from "@/apis/base";
import {
  ChatModelVersion,
  ReadChatModelVersionsRequest,
} from "@/types/ChatModelVersion";

/**
 * Reads a project's ChatModelVersions.
 * @param chatModelData - The data required to fetch ChatModelVersions.
 * @returns A promise that resolves to a list of the ChatModelVersion interface.
 */
export async function fetchChatModelVersions(
  chatModelData: ReadChatModelVersionsRequest
): Promise<Array<ChatModelVersion>> {
  const response = await webServerClient.get("/chat_model_versions", {
    params: chatModelData,
  });
  return response.data;
}
