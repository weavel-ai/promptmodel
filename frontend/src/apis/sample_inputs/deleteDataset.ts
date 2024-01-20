import { webServerClient } from "@/apis/base";
import { DeleteDatasetRequest } from "@/types/SampleInput";

/**
 * Deletes a Dataset from the system.
 * @param requestData - The data required to delete a Dataset.
 * @returns @type {void}
 */
export async function deleteDataset(
  requestData: DeleteDatasetRequest
): Promise<void> {
  const { dataset_uuid } = requestData;
  await webServerClient.delete(`/sample_inputs/dataset/${dataset_uuid}`);
}
