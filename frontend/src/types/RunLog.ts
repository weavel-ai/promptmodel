// Interfaces for RunLog retrieval processes

/**
 * Interface for request to read FunctionModelVersion's RunLogs.
 */
export interface ReadVersionRunLogsRequest {
  function_model_version_uuid: string;
}

/**
 * Interface for request to read Project's RunLogs.
 */
export interface ReadProjectRunLogsRequest {
  project_uuid: string;
  page: number;
  rows_per_page: number;
}

/**
 * Interface for request to read BatchRun's RunLogs.
 */
export interface ReadBatchRunLogsRequest {
  batch_run_uuid: string;
  page: number;
  rows_per_page: number;
}

/**
 * Interface for request to read Project's RunLogs count.
 */
export interface ReadProjectRunLogsCountRequest {
  project_uuid: string;
}

/**
 * Interface for response of RunLogs count.
 */
export interface ReadProjectRunLogsCountResponse {
  project_uuid: string;
  count: number;
}

/**
 * General interface for RunLog.
 */
export interface RunLog {
  id: number;
  created_at: string;
  uuid: string;
  run_from_deployment: boolean;
  input_register_name: string;
  inputs: Record<string, any>;
  raw_output: string;
  parsed_outputs: Record<string, any>;
  function_call: Record<string, any>;
  run_log_metadata: Record<string, any>;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  latency: number;
  cost: number;
  version_uuid: string;
  project_uuid: string;
  sample_input_uuid?: string;
}

/**
 * Interface for RunLog with score.
 */
export interface RunLogWithScore extends RunLog {
  score: number;
  eval_metric_name: string;
  eval_metric_uuid: number;
}

export interface saveRunLogsRequest {
  inputs?: Record<string, any>;
  raw_output?: string;
  parsed_outputs?: Record<string, any>;
  tool_calls?: Array<Record<string, any>>;
  function_call?: Record<string, any>;

  sample_input_uuid?: string;
  run_log_metadata?: Record<string, any>;
}
