// Interfaces for FunctionModelVersion update and retrieval processes

/**
 * Interface for the request to read a FunctionModel's FunctionModelVersions.
 */
export interface ReadFunctionModelVersionsRequest {
  function_model_uuid: string;
}

/**
 * Interface for the request to read a FunctionModelVersion's information.
 */
export interface ReadFunctionModelVersionRequest {
  uuid: string;
}

/**
 * Interface for the request to create a new FunctionModelVersion.
 */
export interface CreateFunctionModelVersionRequest {
  project_uuid: string;
  function_model_uuid: string;
  prompts: { role: string; step: number; content: string }[];
  model: string;
  from_version?: number | null;
  parsing_type?: string;
  output_keys?: Array<string>;
  functions?: Array<string>;
}

/**
 * Interface for the request to update the published FunctionModelVersion.
 */
export interface UpdatePublishedFunctionModelVersionRequest {
  uuid: string; // FunctionModelVersion UUID
  project_uuid: string;
  project_version: number;
  previous_published_version_uuid: string;
}

/**
 * Interface for the request to update a FunctionModelVersion's tags.
 */
export interface UpdateFunctionModelVersionTagsRequest {
  uuid: string;
  tags: Array<string>;
}

/**
 * Interface for the request to update a FunctionModelVersion's memo.
 */
export interface UpdateFunctionModelVersionMemoRequest {
  uuid: string;
  memo: string;
}

/**
 * Interface for the request to delete a FunctionModelVersion.
 */
export interface DeleteFunctionModelVersionRequest {
  uuid: string;
}

/**
 * General interface for representing a FunctionModelVersion in the system.
 */
export interface FunctionModelVersion {
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
  function_model_uuid: string;
}