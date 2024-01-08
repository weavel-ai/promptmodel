import { webServerClient } from "@/apis/base";
import { CreateFunctionModelVersionRequest } from "@/types/FunctionModelVersion";
import { FunctionModelVersion } from "@/types/FunctionModelVersion";

/**
 * Creates a new FunctionModelVersion in the system.
 * @param functionModelVersionData - The data required to create a new FunctionModel.
 * @returns A promise that resolves to the FunctionModelVersion interface.
 */
export async function createFunctionModelVersion(
  functionModelVersionData: CreateFunctionModelVersionRequest
): Promise<FunctionModelVersion> {
  const response = await webServerClient.post(
    "/function_model_versions",
    functionModelVersionData
  );
  return response.data;
}
