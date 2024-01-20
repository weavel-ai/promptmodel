// Interfaces for Project creation and retrieval processes

/**
 * Interface for project creation request.
 */
export interface CreateProjectRequest {
  organization_id: string;
  name: string;
  description?: string;
}

/**
 * Interface for the request to read a project's information.
 */
export interface ReadProjectRequest {
  uuid: string;
}

/**
 * Interface for the request to read an organization's projects.
 */
export interface ReadOrgProjectsRequest {
  organization_slug: string;
}

/**
 * General Project interface for representing a project in the system.
 */
export interface Project {
  id: number;
  uuid: string;
  created_at: string;
  name: string;
  api_key: string;
  version: number;
  online: boolean;
  organization_id: string;
  description: string;
  cli_access_token: string;
  is_public: boolean;
}
