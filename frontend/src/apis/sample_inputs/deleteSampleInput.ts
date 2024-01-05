import { webServerClient } from "@/apis/base";
import { DeleteSampleInputRequest, SampleInput } from "@/types/SampleInput";

/**
 * Deletes a SampleInput from the system.
 * @param requestData - The data required to delete a SampleInput.
 * @returns @type {void}
 */
export async function deleteSampleInput(
  requestData: DeleteSampleInputRequest
): Promise<void> {
  const { sample_input_uuid } = requestData;
  await webServerClient.delete(`/sample_inputs/${sample_input_uuid}`);
}
