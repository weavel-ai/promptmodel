import { railwayWebClient } from "@/apis/base";
import {
  FunctionModelVersion,
  ReadFunctionModelVersionsRequest,
} from "@/types/FunctionModelVersion";

/**
 * Reads a project's FunctionModelVersions.
 * @param functionModelData - The data required to fetch FunctionModelVersions.
 * @returns A promise that resolves to a list of the FunctionModelVersion interface.
 */
export async function fetchFunctionModelVersions(
  functionModelData: ReadFunctionModelVersionsRequest
): Promise<Array<FunctionModelVersion>> {
  const response = await railwayWebClient.get("/function_model_versions", {
    params: functionModelData,
  });
  return response.data;
}