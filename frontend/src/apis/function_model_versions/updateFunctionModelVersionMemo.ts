import { railwayWebClient } from "@/apis/base";
import {
  FunctionModelVersion,
  UpdateFunctionModelVersionMemoRequest,
} from "@/types/FunctionModelVersion";

/**
 * Sends a request update a FunctionModelVersion's memo.
 * @param requestData - The data required to update FunctionModelVersion's memo.
 * @returns A promise that resolves to the FunctionModelVersion interface.
 */
export async function updateFunctionModelVersionMemo(
  requestData: UpdateFunctionModelVersionMemoRequest
): Promise<FunctionModelVersion> {
  const { uuid, ...params } = requestData;
  const response = await railwayWebClient.patch(
    `/function_model_versions/${uuid}/memo`,
    {},
    {
      params: params,
    }
  );
  return response.data;
}
