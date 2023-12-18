// Interfaces for SampleInput retrieval processes

/**
 * Interface for request to create a SampleInput.
 */
export interface CreateSampleInputRequest {
  project_uuid: string;
  name?: string | null;
  input_keys: Array<string>;
  content: Record<string, any>;
  function_model_uuid?: string | null;
}

/**
 * Interface for request to read Project's SampleInputs.
 */
export interface ReadProjectSampleInputsRequest {
  project_uuid: string;
}

/**
 * Interface for request to read a FunctionModel's SampleInputs.
 */
export interface ReadFunctionModelSampleInputsRequest {
  function_model_uuid: string;
}

/**
 * General interface for SampleInput.
 */
export interface SampleInput {
  id: number;
  created_at: string;
  uuid: string;
  name: string;
  content: Record<string, any>;
  input_keys: Array<string>;
  online: true;
  project_uuid: string;
  function_model_uuid: string;
}
