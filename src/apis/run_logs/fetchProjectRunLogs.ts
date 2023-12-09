import { railwayWebClient } from "@/apis/base";
import { RunLog, ReadProjectRunLogsRequest } from "@/types/RunLog";

/**
 * Reads a Project's RunLogs.
 * @param requestData - The data required to fetch RunLogs.
 * @returns A promise that resolves to a list of the RunLog interface.
 */
export async function fetchProjectRunLogs(
  requestData: ReadProjectRunLogsRequest
): Promise<Array<RunLog>> {
  const response = await railwayWebClient.get("/run_logs/project", {
    params: requestData,
  });
  return response.data;
}
