import { webServerClient } from "@/apis/base";
import {
  RunLog,
  ReadBatchRunLogsRequest,
  RunLogWithScore,
} from "@/types/RunLog";

/**
 * Reads a BatchRun's RunLogs.
 * @param requestData - The data required to fetch RunLogs.
 * @returns A promise that resolves to a list of the RunLog interface.
 */
export async function fetchBatchRunLogs(
  requestData: ReadBatchRunLogsRequest
): Promise<Array<RunLogWithScore>> {
  const response = await webServerClient.get("/run_logs/batch_run", {
    params: requestData,
  });
  return response.data;
}
