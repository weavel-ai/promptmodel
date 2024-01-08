import { webServerClient } from "@/apis/base";
import { FunctionModelVersion } from "@/types/FunctionModelVersion";
import { DeleteFunctionModelVersionRequest } from "@/types/FunctionModelVersion";

/**
 * Deletes a FunctionModel from the system.
 * @param functionModelVersionData - The data required to delete a FunctionModel.
 * @returns A promise that resolves to the FunctionModel interface.
 */
export async function deleteFunctionModelVersion(
  functionModelVersionData: DeleteFunctionModelVersionRequest
): Promise<FunctionModelVersion> {
  const response = await webServerClient.delete(
    `/function_model_versions/${functionModelVersionData.uuid}`
  );
  return response.data;
}
