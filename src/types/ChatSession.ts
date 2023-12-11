// Interfaces for ChatSession retrieval processes

/**
 * Interface for request to read ChatModelVersion's ChatSessions.
 */
export interface ReadChatSessionsRequest {
  chat_model_version_uuid: string;
}

/**
 * General interface for ChatSession.
 */
export interface ChatSession {
  id: number;
  created_at: string;
  uuid: string;
  run_from_deployment: boolean;
  session_metadata: Record<string, any>;
  version_uuid: string;
}
