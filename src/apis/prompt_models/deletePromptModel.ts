import { railwayWebClient } from "@/apis/base";
import { PromptModel } from "@/types/PromptModel";
import { DeletePromptModelRequest } from "@/types/PromptModel";

/**
 * Deletes a PromptModel from the system.
 * @param promptModelData - The data required to delete a PromptModel.
 * @returns A promise that resolves to the PromptModel interface.
 */
export async function deletePromptModel(
  promptModelData: DeletePromptModelRequest
): Promise<PromptModel> {
  const response = await railwayWebClient.delete(
    `/prompt_models/${promptModelData.uuid}`
  );
  return response.data;
}
