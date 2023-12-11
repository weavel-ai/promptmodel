import { railwayWebClient } from "@/apis/base";
import {
  FunctionModelVersion,
  ReadFunctionModelVersionRequest,
} from "@/types/FunctionModelVersion";

/**
 * Reads a FunctionModelVersion's information.
 * @param functionModelVersionData - The data required to fetch FunctionModelVersion.
 * @returns A promise that resolves to the FunctionModelVersion interface.
 */
export async function fetchFunctionModelVersion(
  functionModelVersionData: ReadFunctionModelVersionRequest
): Promise<FunctionModelVersion> {
  const response = await railwayWebClient.get(
    `/function_model_versions/${functionModelVersionData.uuid}`
  );
  return response.data;
}
