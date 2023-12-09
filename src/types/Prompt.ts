// Interfaces for Prompt retrieval processes

/**
 * Interface for request to read PromptModelVersion's Prompts.
 */
export interface ReadPromptsRequest {
  prompt_model_version_uuid: string;
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
