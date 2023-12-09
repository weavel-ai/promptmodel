// Interfaces for PromptModel creation and retrieval processes

/**
 * Interface for PromptModel creation request.
 */
export interface CreatePromptModelRequest {
  project_uuid: string;
  name: string;
}

/**
 * Interface for the request to edit a PromptModel's information.
 */
export interface EditPromptModelRequest {
  uuid: string;
  name: string;
}

/**
 * Interface for the request to delete a PromptModel.
 */
export interface DeletePromptModelRequest {
  uuid: string;
}

/**
 * Interface for the request to read an project's PromptModels.
 */
export interface ReadPromptModelsRequest {
  project_uuid: string;
}

/**
 * General PromptModel interface for representing a PromptModel in the system.
 */
export interface PromptModel {
  id: number;
  created_at: string;
  uuid: string;
  name: string;
  online: boolean;
  project_uuid: string;
}
