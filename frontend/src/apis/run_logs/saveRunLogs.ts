import { webServerClient } from "@/apis/base";
import { RunLog, saveRunLogsRequest } from "@/types/RunLog";

/**
 * Creates a new FunctionModelVersion in the system.
 * @param RunLogDataList - The data required to create a new FunctionModel.
 * @returns A promise that resolves to the FunctionModelVersion interface.
 */
export async function saveRunLogs(
  functionModelVersionUuid: string,
  RunLogDataList: Array<saveRunLogsRequest>
): Promise<Array<RunLog>> {
  const response = await webServerClient.post(
    `/version/${functionModelVersionUuid}`,
    RunLogDataList
  );
  return response.data;
}
