// Interfaces for postgres table subscription processes

/**
 * Interface for request to subscribe to a postgres table.
 */
export interface SubscribeTableRequest {
  tableName: string;
  project_uuid?: string | undefined;
  organization_id?: string | undefined;
  onMessage: (message: any) => void;
}
