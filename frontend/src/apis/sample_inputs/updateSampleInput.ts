import { webServerClient } from "@/apis/base";
import { UpdateSampleInputRequest, SampleInput } from "@/types/SampleInput";

/**
 * Updates a SampleInput in the system.
 * @param requestData - The data required to update a SampleInput.
 * @returns A promise that resolves to the SampleInput interface.
 */
export async function updateSampleInput(
  requestData: UpdateSampleInputRequest
): Promise<SampleInput> {
  const { uuid, ...body } = requestData;
  const response = await webServerClient.patch(`/sample_inputs/${uuid}`, body);
  return response.data;
}
