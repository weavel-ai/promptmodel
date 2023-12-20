import { webServerClient } from "@/apis/base";
import {
  ChatModelVersion,
  ReadChatModelVersionRequest,
} from "@/types/ChatModelVersion";

/**
 * Reads a ChatModelVersion's information.
 * @param chatModelVersionData - The data required to fetch ChatModelVersion.
 * @returns A promise that resolves to the ChatModelVersion interface.
 */
export async function fetchChatModelVersion(
  chatModelVersionData: ReadChatModelVersionRequest
): Promise<ChatModelVersion> {
  const response = await webServerClient.get(
    `/chat_model_versions/${chatModelVersionData.uuid}`
  );
  return response.data;
}
