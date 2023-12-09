import { railwayWebClient } from "@/apis/base";
import { CreatePromptModelRequest } from "@/types/PromptModel";
import { PromptModel } from "@/types/PromptModel";

/**
 * Creates a new PromptModel in the system.
 * @param promptModelData - The data required to create a new PromptModel.
 * @returns A promise that resolves to the PromptModel interface.
 */
export async function createPromptModel(
  promptModelData: CreatePromptModelRequest
): Promise<PromptModel> {
  const response = await railwayWebClient.post(
    "/prompt_models",
    promptModelData
  );
  if (response.status !== 201) {
    throw new Error("Error creating PromptModel: " + response.status);
  }
  return response.data;
}
