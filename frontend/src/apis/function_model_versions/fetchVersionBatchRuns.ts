import { webServerClient } from "@/apis/base";
import { BatchRun, ReadFunctionModelBatchRunsRequest } from "@/types/BatchRun";

/**
 * Reads a FunctionModelVersion's BatchRuns.
 * @param requestData - The data required to fetch BatchRuns.
 * @returns @type {Array<BatchRun>} A promise that resolves to a list of the DatasetBatchRun interface.
 */
export async function fetchVersionBatchRuns(
  requestData: ReadFunctionModelBatchRunsRequest
): Promise<Array<BatchRun>> {
  const { uuid } = requestData;

  const response = await webServerClient.get(
    `/function_model_versions/${uuid}/batch_runs`
  );
  return response.data;
}
