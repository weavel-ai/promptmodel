// Interfaces for PromptModelVersion update and retrieval processes

/**
 * Interface for the request to read a PromptModel's PromptModelVersions.
 */
export interface ReadPromptModelVersionsRequest {
  prompt_model_uuid: string;
}

/**
 * Interface for the request to read a PromptModelVersion's information.
 */
export interface ReadPromptModelVersionRequest {
  uuid: string;
}

/**
 * Interface for the request to update the published PromptModelVersion.
 */
export interface UpdatePublishedPromptModelVersionRequest {
  uuid: string; // PromptModelVersion UUID
  project_uuid: string;
  project_version: number;
  previous_published_version_uuid: string;
}

/**
 * Interface for the request to update a PromptModelVersion's tags.
 */
export interface UpdatePromptModelVersionTagsRequest {
  uuid: string;
  tags: Array<string>;
}

/**
 * Interface for the request to update a PromptModelVersion's memo.
 */
export interface UpdatePromptModelVersionMemoRequest {
  uuid: string;
  memo: string;
}

/**
 * General interface for representing a PromptModelVersion in the system.
 */
export interface PromptModelVersion {
  id: number;
  created_at: string;
  uuid: string;
  version: number;
  model: string;
  is_published: true;
  from_version: number;
  parsing_type: string;
  output_keys: Array<string>;
  functions: Array<string>;
  is_ab_test: true;
  ratio: number;
  tags: Array<string>;
  memo: string;
  prompt_model_uuid: string;
}
