// Interfaces for ChatModelVersion update and retrieval processes

/**
 * Interface for the request to read a ChatModel's ChatModelVersions.
 */
export interface ReadChatModelVersionsRequest {
  chat_model_uuid: string;
}

/**
 * Interface for the request to read a ChatModelVersion's information.
 */
export interface ReadChatModelVersionRequest {
  uuid: string;
}

/**
 * Interface for the request to update the published ChatModelVersion.
 */
export interface UpdatePublishedChatModelVersionRequest {
  uuid: string; // ChatModelVersion UUID
  project_uuid: string;
  project_version: string;
  previous_published_version_uuid: string;
}

/**
 * Interface for the request to update a ChatModelVersion's tags.
 */
export interface UpdateChatModelVersionTagsRequest {
  uuid: string;
  tags: Array<string>;
}

/**
 * Interface for the request to update a ChatModelVersion's memo.
 */
export interface UpdateChatModelVersionMemoRequest {
  uuid: string;
  memo: string;
}

/**
 * General interface for representing a ChatModelVersion in the system.
 */
export interface ChatModelVersion {
  id: number;
  created_at: string;
  uuid: string;
  version: number;
  model: string;
  system_prompt: string;
  is_published: boolean;
  functions: Array<string>;
  is_ab_test: boolean;
  ratio: number;
  from_version: number;
  tags: Array<string>;
  memo: string;
  chat_model_uuid: string;
}
