// Interfaces for CliAccess update processes

/**
 * Interface for request to update CliAccess.
 */
export interface UpdateCliAccessRequest {
  user_id: string;
  api_key: string;
}

/**
 * General interface for CliAccess.
 */
export interface CliAccess {
  user_id: string;
  api_key: string;
}
