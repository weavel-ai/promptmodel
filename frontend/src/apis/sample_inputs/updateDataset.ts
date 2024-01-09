import { webServerClient } from "@/apis/base";
import { Dataset, UpdateDatasetRequest } from "@/types/SampleInput";

/**
 * Updates a Dataset in the system.
 * @param requestData - The data required to update a Dataset.
 * @returns A promise that resolves to the Dataset interface.
 */
export async function updateDataset(
  requestData: UpdateDatasetRequest
): Promise<Dataset> {
  const { uuid, ...body } = requestData;
  const response = await webServerClient.patch(
    `/sample_inputs/dataset/${uuid}`,
    body
  );
  return response.data;
}
