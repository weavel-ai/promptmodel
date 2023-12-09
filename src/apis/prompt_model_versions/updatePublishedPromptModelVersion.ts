import { railwayWebClient } from "@/apis/base";
import {
  PromptModelVersion,
  UpdatePublishedPromptModelVersionRequest,
} from "@/types/PromptModelVersion";

/**
 * Sends a request to publish a new PromptModelVersion.
 * @param promptModelVersionData - The data required to publish a PromptModelVersion.
 * @returns A promise that resolves to the PromptModelVersion interface.
 */
export async function updatePublishedPromptModelVersion(
  promptModelVersionData: UpdatePublishedPromptModelVersionRequest
): Promise<PromptModelVersion> {
  const { uuid, ...body } = promptModelVersionData;
  const response = await railwayWebClient.post(
    `/prompt_model_versions/${uuid}/publish`,
    body
  );
  return response.data;
}
