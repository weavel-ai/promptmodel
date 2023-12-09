import { railwayWebClient } from "@/apis/base";
import { ReadDailyRunLogMetricsRequest, RunLogMetric } from "@/types/Metric";

/**
 * Reads a Project's daily RunLogMetrics.
 * @param requestData - The data required to fetch daily RunLogMetrics.
 * @returns A promise that resolves to a list of the RunLogMetric interface.
 */
export async function fetchDailyRunLogMetrics(
  requestData: ReadDailyRunLogMetricsRequest
): Promise<Array<RunLogMetric>> {
  const response = await railwayWebClient.get("/metrics/prompt_model", {
    params: requestData,
  });
  return response.data;
}
