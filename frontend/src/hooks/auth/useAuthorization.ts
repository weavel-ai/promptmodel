import { useMemo } from "react";
import { useProject } from "../useProject";
import { useAuth } from "./useAuth";

export function useAuthorization() {
  const { orgId, isLoaded } = useAuth();
  const { projectData } = useProject();

  const isAuthorizedForProject = useMemo(() => {
    return projectData?.organization_id == orgId;
  }, [projectData?.organization_id, orgId]);

  const isLoading = useMemo(
    () => !isLoaded || !projectData,
    [isLoaded, projectData]
  );

  return {
    isLoading,
    isAuthorizedForProject,
  };
}
