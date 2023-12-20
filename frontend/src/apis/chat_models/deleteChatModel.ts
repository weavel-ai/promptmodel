import { webServerClient } from "@/apis/base";
import { ChatModel, DeleteChatModelRequest } from "@/types/ChatModel";

/**
 * Deletes a ChatModel from the system.
 * @param chatModelData - The data required to delete a ChatModel.
 * @returns A promise that resolves to the ChatModel interface.
 */
export async function deleteChatModel(
  chatModelData: DeleteChatModelRequest
): Promise<ChatModel> {
  const response = await webServerClient.delete(
    `/chat_models/${chatModelData.uuid}`
  );
  return response.data;
}
