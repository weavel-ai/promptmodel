import { webServerClient } from "@/apis/base";
import {
  ReadDatasetSampleInputsCountRequest,
  ReadDatasetSampleInputsCountResponse,
} from "@/types/SampleInput";

/**
 * Reads a Dataset's SampleInputs count.
 * @param requestData - The data required to fetch RunLogs count.
 * @returns A promise that resolves to a Dataset SampleInputs count response interface.
 */
export async function fetchDatasetSampleInputsCount(
  requestData: ReadDatasetSampleInputsCountRequest
): Promise<ReadDatasetSampleInputsCountResponse> {
  const { dataset_uuid } = requestData;

  const response = await webServerClient.get(
    `/sample_inputs/dataset/${dataset_uuid}/count`
  );
  return response.data;
}
