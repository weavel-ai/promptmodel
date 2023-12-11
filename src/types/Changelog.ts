// Interfaces for Changelog retrieval processes

/**
 * Interface for request to read Project's Changelogs.
 */
export interface ReadProjectChangelogsRequest {
  project_uuid: string;
}

/**
 * General interface for Changelog.
 */
export interface Changelog {
  id: number;
  created_at: string;
  logs: Array<Record<string, any>>;
  project_uuid: string;
}
