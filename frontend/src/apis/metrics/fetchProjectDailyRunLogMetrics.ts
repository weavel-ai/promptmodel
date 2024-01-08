import { webServerClient } from "@/apis/base";
import {
  ProjectRunLogMetric,
  ReadDailyRunLogMetricsRequest,
  ReadProjectDailyRunLogMetricsRequest,
  RunLogMetric,
} from "@/types/Metric";

/**
 * Reads a Project's daily RunLogMetrics.
 * @param requestData - The data required to fetch project daily RunLogMetrics.
 * @returns A promise that resolves to a list of the RunLogMetric interface.
 */
export async function fetchProjectDailyRunLogMetrics(
  requestData: ReadProjectDailyRunLogMetricsRequest
): Promise<Array<ProjectRunLogMetric>> {
  const response = await webServerClient.get("/metrics/project", {
    params: requestData,
  });
  return response.data;
}
