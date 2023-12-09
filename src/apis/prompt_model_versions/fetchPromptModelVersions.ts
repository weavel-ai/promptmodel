import { railwayWebClient } from "@/apis/base";
import {
  PromptModelVersion,
  ReadPromptModelVersionsRequest,
} from "@/types/PromptModelVersion";

/**
 * Reads a project's PromptModelVersions.
 * @param promptModelData - The data required to fetch PromptModelVersions.
 * @returns A promise that resolves to a list of the PromptModelVersion interface.
 */
export async function fetchPromptModelVersions(
  promptModelData: ReadPromptModelVersionsRequest
): Promise<Array<PromptModelVersion>> {
  const response = await railwayWebClient.get("/prompt_model_versions", {
    params: promptModelData,
  });
  return response.data;
}
