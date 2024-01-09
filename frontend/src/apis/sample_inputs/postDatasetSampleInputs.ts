import { webServerClient } from "@/apis/base";
import { PostDatasetSampleInputsRequest, Dataset } from "@/types/SampleInput";

/**
 * Uploads a list of SampleInputs to an existing Dataset.
 * @param requestData
 * @returns @type {void}.
 */
export async function postDatasetSampleInputs(
  requestData: PostDatasetSampleInputsRequest
): Promise<void> {
  const { dataset_uuid, body } = requestData;
  await webServerClient.post(`/sample_inputs/dataset/${dataset_uuid}`, body);
}
