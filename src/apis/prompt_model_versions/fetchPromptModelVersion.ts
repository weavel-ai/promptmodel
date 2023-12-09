import { railwayWebClient } from "@/apis/base";
import {
  PromptModelVersion,
  ReadPromptModelVersionRequest,
} from "@/types/PromptModelVersion";

/**
 * Reads a PromptModelVersion's information.
 * @param promptModelVersionData - The data required to fetch PromptModelVersion.
 * @returns A promise that resolves to the PromptModelVersion interface.
 */
export async function fetchPromptModelVersion(
  promptModelVersionData: ReadPromptModelVersionRequest
): Promise<PromptModelVersion> {
  const response = await railwayWebClient.get(
    `/prompt_model_versions/${promptModelVersionData.uuid}`
  );
  return response.data;
}
