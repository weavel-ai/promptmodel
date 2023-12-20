import { webServerClient } from "@/apis/base";
import {
  ReadProjectSampleInputsRequest,
  SampleInput,
} from "@/types/SampleInput";

/**
 * Reads a SampleInput's information.
 * @param requestData - The data required to fetch a SampleInput.
 * @returns A promise that resolves to a SampleInput interface.
 */
export async function fetchProjectSampleInputs(
  requestData: ReadProjectSampleInputsRequest
): Promise<Array<SampleInput>> {
  const response = await webServerClient.get("/sample_inputs/project", {
    params: requestData,
  });
  return response.data;
}
