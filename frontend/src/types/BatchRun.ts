/**
 * Interface for request to read FunctionModel's BatchRuns.
 */
export interface ReadFunctionModelBatchRunsRequest {
  uuid: string;
}

/**
 * Interface for request to create a FunctionModelVersion's BatchRun.
 */
export interface StartFunctionModelVersionBatchRunRequest {
  project_uuid: string;
  function_model_version_uuid: string;
  dataset_uuid: string;
}

/**
 * General interface for BatchRun.
 */
export interface BatchRun {
  uuid: string;
  created_at: string;
  finished_at: string;
  dataset_uuid: string;
  status: string;
  score?: number | null;
}
