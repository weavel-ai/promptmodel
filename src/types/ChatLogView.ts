// Interfaces for ChatLog retrieval processes

/**
 * General interface for ChatLog view.
 */
export interface ChatLogView {
  project_uuid: string;
  chat_model_uuid: string;
  chat_model_name: string;
  chat_model_version_uuid: string;
  chat_model_version: number;
  session_uuid: string;
  assistant_message_uuid: string;
  created_at: string;
  user_input: string;
  assistant_output: string;
  tool_calls: Array<Record<string, any>>;
  function_call: Record<string, any>;
  latency: number;
  cost: number;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  run_from_deployment: boolean;
}
