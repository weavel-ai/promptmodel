import { webServerClient } from "@/apis/base";
import {
  ChatModelVersion,
  UpdatePublishedChatModelVersionRequest,
} from "@/types/ChatModelVersion";

/**
 * Sends a request to publish a new ChatModelVersion.
 * @param chatModelVersionData - The data required to publish a ChatModelVersion.
 * @returns A promise that resolves to the ChatModelVersion interface.
 */
export async function updatePublishedChatModelVersion(
  chatModelVersionData: UpdatePublishedChatModelVersionRequest
): Promise<ChatModelVersion> {
  const response = await webServerClient.post(
    `/chat_model_versions/${chatModelVersionData.uuid}/publish`
  );
  return response.data;
}
