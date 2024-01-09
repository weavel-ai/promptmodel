import { webServerClient } from "@/apis/base";
import {
  ReadDatasetSampleInputsRequest,
  SampleInput,
} from "@/types/SampleInput";

/**
 * Reads a Dataset's SampleInputs.
 * @param requestData - The data required to fetch a Dataset's SampleInputs.
 * @returns @type {Array<SampleInput>} - The Dataset's SampleInputs.
 */
export async function fetchDatasetSampleInputs(
  requestData: ReadDatasetSampleInputsRequest
): Promise<Array<SampleInput>> {
  const { dataset_uuid, ...params } = requestData;
  const response = await webServerClient.get(
    `/sample_inputs/dataset/${dataset_uuid}`,
    {
      params: params,
    }
  );
  return response.data;
}
