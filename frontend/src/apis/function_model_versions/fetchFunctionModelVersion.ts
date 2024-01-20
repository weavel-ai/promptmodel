import { webServerClient } from "@/apis/base";
import {
  FunctionModelVersion,
  FunctionModelVersionWithUser,
  ReadFunctionModelVersionRequest,
} from "@/types/FunctionModelVersion";

/**
 * Reads a FunctionModelVersion's information.
 * @param functionModelVersionData - The data required to fetch FunctionModelVersion.
 * @returns A promise that resolves to the FunctionModelVersion interface.
 */
export async function fetchFunctionModelVersion(
  functionModelVersionData: ReadFunctionModelVersionRequest
): Promise<FunctionModelVersionWithUser> {
  const response = await webServerClient.get(
    `/function_model_versions/${functionModelVersionData.uuid}`
  );
  return response.data;
}
