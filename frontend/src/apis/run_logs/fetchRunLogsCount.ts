import { railwayWebClient } from "@/apis/base";
import {
  ReadProjectRunLogsCountRequest,
  ReadProjectRunLogsCountResponse,
} from "@/types/RunLog";

/**
 * Reads a Project's RunLogs count.
 * @param requestData - The data required to fetch RunLogs count.
 * @returns A promise that resolves to a RunLogs count response interface.
 */
export async function fetchProjectRunLogsCount(
  requestData: ReadProjectRunLogsCountRequest
): Promise<ReadProjectRunLogsCountResponse> {
  const response = await railwayWebClient.get("/run_logs/count", {
    params: requestData,
  });
  return response.data;
}
