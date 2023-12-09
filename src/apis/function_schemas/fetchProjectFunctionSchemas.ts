import { railwayWebClient } from "@/apis/base";
import {
  FunctionSchema,
  ReadProjectFunctionSchemasRequest,
} from "@/types/FunctionSchema";

/**
 * Reads a Project's FunctionSchemas.
 * @param requestData - The data required to fetch FunctionSchemas.
 * @returns A promise that resolves to a list of the FunctionSchema interface.
 */
export async function fetchProjectFunctionSchemas(
  requestData: ReadProjectFunctionSchemasRequest
): Promise<Array<FunctionSchema>> {
  const response = await railwayWebClient.get("/function_schemas", {
    params: requestData,
  });
  return response.data;
}
