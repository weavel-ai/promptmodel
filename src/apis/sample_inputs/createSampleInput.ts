import { railwayWebClient } from "@/apis/base";
import { CreateSampleInputRequest, SampleInput } from "@/types/SampleInput";

/**
 * Creates a new SampleInput in the system.
 * @param requestData - The data required to create a new SampleInput.
 * @returns A promise that resolves to the SampleInput interface.
 */
export async function createSampleInput(
  requestData: CreateSampleInputRequest
): Promise<SampleInput> {
  const response = await railwayWebClient.post("/chat_models", requestData);
  if (response.status !== 201) {
    throw new Error("Error creating sample input: " + response.status);
  }
  return response.data;
}
