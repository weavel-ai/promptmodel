import { webServerClient } from "@/apis/base";
import { CreateChatModelRequest } from "@/types/ChatModel";
import { ChatModel } from "@/types/ChatModel";

/**
 * Creates a new ChatModel in the system.
 * @param chatModelData - The data required to create a new ChatModel.
 * @returns A promise that resolves to the ChatModel interface.
 */
export async function createChatModel(
  chatModelData: CreateChatModelRequest
): Promise<ChatModel> {
  const response = await webServerClient.post("/chat_models", chatModelData);
  return response.data;
}
