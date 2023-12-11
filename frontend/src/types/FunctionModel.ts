// Interfaces for FunctionModel creation and retrieval processes

/**
 * Interface for FunctionModel creation request.
 */
export interface CreateFunctionModelRequest {
  project_uuid: string;
  name: string;
}

/**
 * Interface for the request to edit a FunctionModel's information.
 */
export interface EditFunctionModelRequest {
  uuid: string;
  name: string;
}

/**
 * Interface for the request to delete a FunctionModel.
 */
export interface DeleteFunctionModelRequest {
  uuid: string;
}

/**
 * Interface for the request to read an project's FunctionModels.
 */
export interface ReadFunctionModelsRequest {
  project_uuid: string;
}

/**
 * General FunctionModel interface for representing a FunctionModel in the system.
 */
export interface FunctionModel {
  id: number;
  created_at: string;
  uuid: string;
  name: string;
  online: boolean;
  project_uuid: string;
}
