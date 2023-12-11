import { railwayWebClient } from "@/apis/base";
import { ChatModel, EditChatModelRequest } from "@/types/ChatModel";

/**
 * Edits a ChatModel's information.
 * @param chatModelData - The data required to edit a ChatModel.
 * @returns A promise that resolves to the ChatModel interface.
 */
export async function editChatModel(
  chatModelData: EditChatModelRequest
): Promise<ChatModel> {
  const { uuid, ...params } = chatModelData;
  const response = await railwayWebClient.patch(
    `/chat_models/${uuid}`,
    {},
    {
      params: params,
    }
  );
  return response.data;
}
