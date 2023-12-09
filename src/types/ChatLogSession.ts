// Interfaces for ChatLogSession retrieval processes

/**
 * Interface for request to read ChatModelVersion's ChatLogSessions.
 */
export interface ReadChatLogSessionsRequest {
  chat_model_version_uuid: string;
}

/**
 * General interface for ChatLogSession.
 */
export interface ChatLogSession {
  id: number;
  created_at: string;
  uuid: string;
  run_from_deployment: boolean;
  session_metadata: Record<string, any>;
  version_uuid: string;
}
