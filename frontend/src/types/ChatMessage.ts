// Interfaces for ChatMessage retrieval processes

/**
 * Interface for request to read ChatModelVersion's ChatMessageSessions.
 */
export interface ReadSessionChatMessagesRequest {
  chat_session_uuid: string;
  page: number;
  rows_per_page: number;
}

/**
 * Interface for request to read Project's ChatMessageSessions.
 */
export interface ReadProjectChatMessagesRequest {
  project_uuid: string;
  page: number;
  rows_per_page: number;
}

/**
 * Interface for request to read Project's ChatMessages count.
 */
export interface ReadProjectChatMessagesCountRequest {
  project_uuid: string;
}

/**
 * Interface for response of ChatMessages count.
 */
export interface ReadProjectChatMessagesCountResponse {
  project_uuid: string;
  count: number;
}

/**
 * General interface for ChatMessage.
 */
export interface ChatMessage {
  id?: number;
  created_at: string;
  uuid?: string;
  role: string;
  name?: string;
  content: string;
  tool_calls?: Record<string, any>;
  tokens_count?: number;
  latency?: number;
  cost?: number;
  chat_log_metadata?: Record<string, any>;
  session_uuid?: string;
}
