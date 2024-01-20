import { webServerClient } from "@/apis/base";
import {
  FunctionModelVersion,
  FunctionModelVersionWithUser,
  ReadFunctionModelVersionsRequest,
} from "@/types/FunctionModelVersion";

/**
 * Reads a project's FunctionModelVersions.
 * @param functionModelData - The data required to fetch FunctionModelVersions.
 * @returns A promise that resolves to a list of the FunctionModelVersion interface.
 */
export async function fetchFunctionModelVersions(
  functionModelData: ReadFunctionModelVersionsRequest
): Promise<Array<FunctionModelVersionWithUser>> {
  const response = await webServerClient.get("/function_model_versions", {
    params: functionModelData,
  });
  return response.data;
}
