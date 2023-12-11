// Interfaces for Organization creation and retrieval processes

/**
 * Interface for organization creation request.
 * Includes all necessary fields for creating a new organization account.
 */
export interface CreateOrganizationRequest {
  organization_id: string;
  name: string;
  user_id: string;
  slug: string;
}

/**
 * Interface for organization update request.
 * Includes all necessary fields for updating a organization account.
 */
export interface UpdateOrganizationRequest {
  organization_id: string;
  name: string;
  slug: string;
}

/**
 * Interface for the request to read a organization's information.
 */
export interface ReadOrganizationRequest {
  organization_id: string;
}

/**
 * General Organization interface for representing a organization in the system.
 * This is typically used for responses where sensitive information is not included.
 */
export interface Organization {
  id: number;
  organization_id: string;
  created_at: string;
  name: string;
  slug: string;
  // Additional fields can be included as necessary
}
