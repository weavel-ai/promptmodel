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
  ground_truth?: string | null;
}

/**
 * Interface for request to update a SampleInput.
 */
export interface UpdateSampleInputRequest {
  uuid: string;
  name?: string | null;
  content: Record<string, any>;
  ground_truth?: string | null;
}

/**
 * Interface for request to create a Dataset.
 */
export interface CreateDatasetRequest {
  project_uuid: string;
  name: string;
  description?: string | null;
  function_model_uuid?: string | null;
}

/**
 * Interface for request to update a Dataset.
 */
export interface UpdateDatasetRequest {
  uuid: string;
  name?: string | null;
  description?: string | null;
}

/**
 * Interface for request to post multiple SampleInputs to an existing Dataset.
 */
export interface PostDatasetSampleInputsRequest {
  dataset_uuid: string;
  body: Array<{
    name?: string | null;
    input_keys: Array<string>;
    content: Record<string, any>;
    ground_truth?: string | null;
  }>;
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
 * Interface for request to read a Dataset's SampleInputs.
 */
export interface ReadDatasetSampleInputsRequest {
  dataset_uuid: string;
  page: number;
  rows_per_page: number;
}

/**
 * Interface for request to read Dataset's SampleInputs count.
 */
export interface ReadDatasetSampleInputsCountRequest {
  dataset_uuid: string;
}

/**
 * Interface for response of Dataset's SampleInputs count.
 */
export interface ReadDatasetSampleInputsCountResponse {
  dataset_uuid: string;
  count: number;
}

/**
 * Interface for request to read a FunctionModel's Datasets.
 */
export interface ReadFunctionModelDatasetsRequest {
  function_model_uuid: string;
}

/**
 * Interface for request to delete a SampleInput.
 */
export interface DeleteSampleInputRequest {
  sample_input_uuid: string;
}

/**
 * Interface for datset with eval metric.
 */
export interface DatasetWithEvalMetric {
  id: number;
  dataset_uuid: string;
  dataset_name: string;
  dataset_description?: string | null;
  eval_metric_name: string;
  eval_metric_uuid: string;
  eval_metric_description?: string | null;
  function_model_uuid?: string | null;
  function_model_name?: string | null;
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
  ground_truth?: string | null;
}

/**
 * General interface for Dataset.
 */
export interface Dataset {
  id: number;
  uuid: string;
  name: string;
  description?: string | null;
  project_uuid: string;
  function_model_uuid?: string | null;
  eval_metric_uuid?: string | null;
}
