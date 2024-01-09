import { webServerClient } from "@/apis/base";
import { CreateDatasetRequest, Dataset } from "@/types/SampleInput";

/**
 * Creates a new Dataset in the system.
 * @param requestData - The data required to create a new Dataset.
 * @returns A promise that resolves to the Dataset interface.
 */
export async function createDataset(
  requestData: CreateDatasetRequest
): Promise<Dataset> {
  const response = await webServerClient.post(
    "/sample_inputs/dataset",
    requestData
  );
  return response.data;
}
