// Interfaces for ChatLog retrieval processes

/**
 * Interface for request to read ChatModelVersion's ChatLogSessions.
 */
export interface ReadSessionChatLogsRequest {
  chat_session_uuid: string;
  page: number;
  rows_per_page: number;
}

/**
 * Interface for request to read Project's ChatLogSessions.
 */
export interface ReadProjectChatLogsRequest {
  project_uuid: string;
  page: number;
  rows_per_page: number;
}

/**
 * Interface for request to read Project's ChatLogs count.
 */
export interface ReadProjectChatLogsCountRequest {
  project_uuid: string;
}

/**
 * Interface for response of ChatLogs count.
 */
export interface ReadProjectChatLogsCountResponse {
  project_uuid: string;
  count: number;
}

/**
 * General interface for ChatLog.
 */
export interface ChatLog {
  id?: number;
  created_at: string;
  uuid?: string;
  role: string;
  name?: string;
  content: string;
  tool_calls?: Record<string, any>;
  token_usage?: number;
  latency?: number;
  cost?: number;
  chat_log_metadata?: Record<string, any>;
  session_uuid?: string;
}

/**
 * General interface for ChatLogView.
 */
export interface ChatLogView {
  assistant_log_id: number;
  project_uuid: string;
  chat_model_uuid: string;
  chat_model_name: string;
  chat_model_version_uuid: string;
  chat_model_version: number;
  session_uuid: string;
  created_at: string;
  user_input: string;
  assistant_output: string;
  tool_calls: Record<string, any>;
  latency: number;
  cost: number;
  token_usage: Record<string, any>;
  run_from_deployment: boolean;
}
