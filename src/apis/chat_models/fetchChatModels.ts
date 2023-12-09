import { railwayWebClient } from "@/apis/base";
import { ReadChatModelsRequest } from "@/types/ChatModel";
import { ChatModel } from "@/types/ChatModel";

/**
 * Reads a project's ChatModels.
 * @param projectData - The data required to fetch ChatModels.
 * @returns A promise that resolves to a list of the ChatModel interface.
 */
export async function fetchChatModels(
  projectData: ReadChatModelsRequest
): Promise<Array<ChatModel>> {
  const response = await railwayWebClient.get("/chat_models", {
    params: projectData,
  });
  return response.data;
}
