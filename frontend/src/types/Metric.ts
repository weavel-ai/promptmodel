// Interfaces for Metric retrieval processes

/**
 * Base interface for a Metric.
 */
interface Metric {
  day: string;
  total_cost: number;
  avg_latency: number;
}

/**
 * Interface for request to read project daily RunLogMetrics.
 */
export interface ReadProjectDailyRunLogMetricsRequest {
  project_uuid: string;
  start_day: string;
  end_day: string;
}

/**
 * Interface for request to read module daily RunLogMetrics.
 */
export interface ReadDailyRunLogMetricsRequest {
  function_model_uuid: string;
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
 * General interface for Project RunLogMetric.
 */
export interface ProjectRunLogMetric extends Metric {
  project_uuid?: string;
  total_runs: number;
  total_token_usage: number;
  run_from_deployment: boolean;
}

/**
 * General interface for RunLogMetric.
 */
export interface RunLogMetric extends Metric {
  function_model_uuid?: string;
  function_model_name?: string;
  total_runs: number;
  total_token_usage: number;
}

/**
 * General interface for ChatLogMetric.
 */
export interface ChatLogMetric extends Metric {
  project_name?: string;
  chat_model_uuid?: string;
  chat_model_name?: string;
  total_chat_sessions: number;
  total_token_usage: number;
}
