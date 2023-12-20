import { webServerClient } from "@/apis/base";
import { ReadVersionRunLogsRequest, RunLog } from "@/types/RunLog";

/**
 * Reads a FunctionModelVersion's RunLogs.
 * @param requestData - The data required to fetch RunLogs.
 * @returns A promise that resolves to a list of the RunLog interface.
 */
export async function fetchVersionRunLogs(
  requestData: ReadVersionRunLogsRequest
): Promise<Array<RunLog>> {
  const response = await webServerClient.get("/run_logs/version", {
    params: requestData,
  });
  return response.data;
}
