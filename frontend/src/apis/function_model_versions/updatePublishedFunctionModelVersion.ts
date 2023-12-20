import { webServerClient } from "@/apis/base";
import {
  FunctionModelVersion,
  UpdatePublishedFunctionModelVersionRequest,
} from "@/types/FunctionModelVersion";

/**
 * Sends a request to publish a new FunctionModelVersion.
 * @param functionModelVersionData - The data required to publish a FunctionModelVersion.
 * @returns A promise that resolves to the FunctionModelVersion interface.
 */
export async function updatePublishedFunctionModelVersion(
  functionModelVersionData: UpdatePublishedFunctionModelVersionRequest
): Promise<FunctionModelVersion> {
  const { uuid, ...body } = functionModelVersionData;
  const response = await webServerClient.post(
    `/function_model_versions/${uuid}/publish`,
    body
  );
  return response.data;
}
