import { railwayWebClient } from "@/apis/base";
import { ReadPromptModelsRequest } from "@/types/PromptModel";
import { PromptModel } from "@/types/PromptModel";

/**
 * Reads a project's PromptModels.
 * @param projectData - The data required to fetch PromptModels.
 * @returns A promise that resolves to a list of the PromptModel interface.
 */
export async function fetchPromptModels(
  projectData: ReadPromptModelsRequest
): Promise<Array<PromptModel>> {
  const response = await railwayWebClient.get("/prompt_models", {
    params: projectData,
  });
  return response.data;
}
