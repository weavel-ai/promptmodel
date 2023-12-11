// Interfaces for Tag retrieval processes

/**
 * Interface for request to read Project's Tags.
 */
export interface ReadProjectTagsRequest {
  project_uuid: string;
}

/**
 * Interface for request to read Tag.
 */
export interface CreateTagRequest {
  project_uuid: string;
  name: string;
  color: string;
}

/**
 * General interface for Tag.
 */
export interface Tag {
  id: number;
  created_at: string;
  name: string;
  color: string;
  project_uuid: string;
}
