import { railwayWebClient } from "@/apis/base";
import {
  FunctionSchema,
  ReadFunctionSchemaRequest,
} from "@/types/FunctionSchema";

/**
 * Reads a FunctionSchema's information.
 * @param requestData - The data required to fetch a FunctionSchema.
 * @returns A promise that resolves to a FunctionSchema interface.
 */
export async function fetchFunctionSchema(
  requestData: ReadFunctionSchemaRequest
): Promise<FunctionSchema> {
  const response = await railwayWebClient.get(
    `/function_schemas/${requestData.uuid}`
  );
  return response.data;
}
