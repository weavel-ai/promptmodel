// Interfaces for Metric retrieval processes

/**
 * Base interface for a Metric.
 */
interface Metric {
  day: string;
  total_cost: number;
  avg_latency: number;
  total_token_usage: Record<string, any>;
}

/**
 * Interface for request to read daily RunLogMetrics.
 */
export interface ReadDailyRunLogMetricsRequest {
  prompt_model_uuid: string;
  start_day: string;
  end_day: string;
}

/**
 * Interface for request to read daily ChatLogMetrics.
 */
export interface ReadDailyChatLogMetricsRequest {
  chat_model_uuid: string;
  start_day: string;
  end_day: string;
}

/**
 * General interface for RunLogMetric.
 */
export interface RunLogMetric extends Metric {
  prompt_model_uuid?: string;
  prompt_model_name?: string;
  total_runs: number;
}

/**
 * General interface for ChatLogMetric.
 */
export interface ChatLogMetric extends Metric {
  project_name: string;
  chat_model_uuid: string;
  chat_model_name: string;
  total_chat_sessions: number;
}
