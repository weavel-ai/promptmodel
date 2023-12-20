import { webServerClient } from "@/apis/base";
import { CreateSampleInputRequest, SampleInput } from "@/types/SampleInput";

/**
 * Creates a new SampleInput in the system.
 * @param requestData - The data required to create a new SampleInput.
 * @returns A promise that resolves to the SampleInput interface.
 */
export async function createSampleInput(
  requestData: CreateSampleInputRequest
): Promise<SampleInput> {
  const response = await webServerClient.post("/sample_inputs", requestData);
  return response.data;
}
