// Interfaces for SampleInput retrieval processes

/**
 * Interface for request to create a SampleInput.
 */
export interface CreateSampleInputRequest {
  project_uuid: string;
  name: string;
  content: Record<string, any>;
}

/**
 * Interface for request to read Project's SampleInputs.
 */
export interface ReadProjectSampleInputsRequest {
  project_uuid: string;
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
  online: true;
  project_uuid: string;
}
