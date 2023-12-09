// Interfaces for RunLog retrieval processes

/**
 * Interface for request to read PromptModelVersion's RunLogs.
 */
export interface ReadVersionRunLogsRequest {
  prompt_model_version_uuid: string;
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
  score: number;
  token_usage: Record<string, any>;
  latency: number;
  cost: number;
  version_uuid: string;
}
