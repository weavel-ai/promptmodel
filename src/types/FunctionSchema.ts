// Interfaces for FunctionSchema retrieval processes

/**
 * Interface for request to read Project's FunctionSchemas.
 */
export interface ReadProjectFunctionSchemasRequest {
  project_uuid: string;
}

/**
 * Interface for request to read FunctionSchema.
 */
export interface ReadFunctionSchemaRequest {
  uuid: string;
}

/**
 * General interface for FunctionSchema.
 */
export interface FunctionSchema {
  id: number;
  created_at: string;
  uuid: string;
  name: string;
  parameters: Record<string, any>;
  online: boolean;
  description: string;
  mock_response: Record<string, any>;
  project_uuid: string;
}
