// Interfaces for ChatModel creation and retrieval processes

/**
 * Interface for ChatModel creation request.
 */
export interface CreateChatModelRequest {
  project_uuid: string;
  name: string;
}

/**
 * Interface for the request to edit a ChatModel's information.
 */
export interface EditChatModelRequest {
  uuid: string;
  name: string;
}

/**
 * Interface for the request to delete a ChatModel.
 */
export interface DeleteChatModelRequest {
  uuid: string;
}

/**
 * Interface for the request to read an project's ChatModels.
 */
export interface ReadChatModelsRequest {
  project_uuid: string;
}

/**
 * General ChatModel interface for representing a ChatModel in the system.
 */
export interface ChatModel {
  id: number;
  created_at: string;
  uuid: string;
  name: string;
  online: boolean;
  project_uuid: string;
}
