// Interfaces for Prompt retrieval processes

/**
 * Interface for request to read FunctionModelVersion's Prompts.
 */
export interface ReadPromptsRequest {
  function_model_version_uuid: string;
}

/**
 * General interface for Prompt.
 */
export interface Prompt {
  id: number;
  created_at: string;
  role: string;
  step: number;
  content: string;
  version_uuid: string;
}
