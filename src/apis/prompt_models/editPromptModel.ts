import { railwayWebClient } from "@/apis/base";
import { PromptModel } from "@/types/PromptModel";
import { EditPromptModelRequest } from "@/types/PromptModel";

/**
 * Edits a PromptModel's information.
 * @param promptModelData - The data required to edit a PromptModel.
 * @returns A promise that resolves to the PromptModel interface.
 */
export async function editPromptModel(
  promptModelData: EditPromptModelRequest
): Promise<PromptModel> {
  const { uuid, ...params } = promptModelData;
  const response = await railwayWebClient.patch(
    `/prompt_models/${uuid}`,
    {},
    {
      params: params,
    }
  );
  return response.data;
}
