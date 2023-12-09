import { railwayWebClient } from "@/apis/base";
import { ReadDailyChatLogMetricsRequest, ChatLogMetric } from "@/types/Metric";

/**
 * Reads a Project's daily ChatLogMetrics.
 * @param requestData - The data required to fetch daily ChatLogMetrics.
 * @returns A promise that resolves to a list of the ChatLogMetric interface.
 */
export async function fetchDailyChatLogMetrics(
  requestData: ReadDailyChatLogMetricsRequest
): Promise<Array<ChatLogMetric>> {
  const response = await railwayWebClient.get("/metrics/chat_model", {
    params: requestData,
  });
  return response.data;
}
