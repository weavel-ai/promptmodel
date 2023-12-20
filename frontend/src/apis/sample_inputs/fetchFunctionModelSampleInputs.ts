import { webServerClient } from "@/apis/base";
import {
  ReadFunctionModelSampleInputsRequest,
  SampleInput,
} from "@/types/SampleInput";

/**
 * Reads a SampleInput's information.
 * @param requestData - The data required to fetch a SampleInput.
 * @returns A promise that resolves to a SampleInput interface.
 */
export async function fetchFunctionModelSampleInputs(
  requestData: ReadFunctionModelSampleInputsRequest
): Promise<Array<SampleInput>> {
  const response = await webServerClient.get("/sample_inputs/function_model", {
    params: requestData,
  });
  return response.data;
}
