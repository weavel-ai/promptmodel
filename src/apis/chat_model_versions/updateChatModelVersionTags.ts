import { railwayWebClient } from "@/apis/base";
import {
  ChatModelVersion,
  UpdateChatModelVersionTagsRequest,
} from "@/types/ChatModelVersion";

/**
 * Sends a request update a ChatModelVersion's tags.
 * @param requestData - The data required to update ChatModelVersion's tags.
 * @returns A promise that resolves to the ChatModelVersion interface.
 */
export async function updateChatModelVersionTags(
  requestData: UpdateChatModelVersionTagsRequest
): Promise<ChatModelVersion> {
  const { uuid, ...body } = requestData;
  const response = await railwayWebClient.patch(
    `/chat_model_versions/${uuid}/tags`,
    body
  );
  return response.data;
}
