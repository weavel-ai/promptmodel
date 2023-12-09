import { railwayWebClient } from "@/apis/base";
import {
  ChatModelVersion,
  UpdateChatModelVersionMemoRequest,
} from "@/types/ChatModelVersion";

/**
 * Sends a request update a ChatModelVersion's memo.
 * @param requestData - The data required to update ChatModelVersion's memo.
 * @returns A promise that resolves to the ChatModelVersion interface.
 */
export async function updateChatModelVersionMemo(
  requestData: UpdateChatModelVersionMemoRequest
): Promise<ChatModelVersion> {
  const { uuid, ...params } = requestData;
  const response = await railwayWebClient.patch(
    `/chat_model_versions/${uuid}/memo`,
    {},
    {
      params: params,
    }
  );
  return response.data;
}
