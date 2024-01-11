import { webServerClient } from "@/apis/base";
import { StartFunctionModelVersionBatchRunRequest } from "@/types/BatchRun";

/**
 * Starts and creates a FunctionModelVersion's BatchRun.
 * @param requestData - The data required to create a BatchRuns.
 * @returns @type {void}
 */
export async function startFunctionModelVersionBatchRun(
  body: StartFunctionModelVersionBatchRunRequest
): Promise<void> {
  const response = await webServerClient.post(
    "/run_function_model/batch",
    body
  );
  return response.data;
}
