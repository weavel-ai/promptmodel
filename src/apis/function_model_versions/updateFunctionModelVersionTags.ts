import { railwayWebClient } from "@/apis/base";
import {
  FunctionModelVersion,
  UpdateFunctionModelVersionTagsRequest,
} from "@/types/FunctionModelVersion";

/**
 * Sends a request update a FunctionModelVersion's tags.
 * @param requestData - The data required to update FunctionModelVersion's tags.
 * @returns A promise that resolves to the FunctionModelVersion interface.
 */
export async function updateFunctionModelVersionTags(
  requestData: UpdateFunctionModelVersionTagsRequest
): Promise<FunctionModelVersion> {
  const { uuid, ...body } = requestData;
  const response = await railwayWebClient.patch(
    `/function_model_versions/${uuid}/tags`,
    body
  );
  return response.data;
}
