import { railwayWebClient } from "@/apis/base";
import {
  PromptModelVersion,
  UpdatePromptModelVersionTagsRequest,
} from "@/types/PromptModelVersion";

/**
 * Sends a request update a PromptModelVersion's tags.
 * @param requestData - The data required to update PromptModelVersion's tags.
 * @returns A promise that resolves to the PromptModelVersion interface.
 */
export async function updatePromptModelVersionTags(
  requestData: UpdatePromptModelVersionTagsRequest
): Promise<PromptModelVersion> {
  const { uuid, ...body } = requestData;
  const response = await railwayWebClient.patch(
    `/prompt_model_versions/${uuid}/tags`,
    body
  );
  return response.data;
}
