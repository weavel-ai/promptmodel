import { railwayWebClient } from "@/apis/base";
import {
  PromptModelVersion,
  UpdatePromptModelVersionMemoRequest,
} from "@/types/PromptModelVersion";

/**
 * Sends a request update a PromptModelVersion's memo.
 * @param requestData - The data required to update PromptModelVersion's memo.
 * @returns A promise that resolves to the PromptModelVersion interface.
 */
export async function updatePromptModelVersionMemo(
  requestData: UpdatePromptModelVersionMemoRequest
): Promise<PromptModelVersion> {
  const { uuid, ...params } = requestData;
  const response = await railwayWebClient.patch(
    `/prompt_model_versions/${uuid}/memo`,
    {},
    {
      params: params,
    }
  );
  return response.data;
}
