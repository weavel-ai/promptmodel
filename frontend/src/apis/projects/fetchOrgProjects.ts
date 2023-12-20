import { webServerClient } from "@/apis/base";
import { Project, ReadOrgProjectsRequest } from "@/types/Project";

/**
 * Reads an organization's projects.
 * @param orgData - The data required to fetch projects.
 * @returns A promise that resolves to a list of the Project interface.
 */
export async function fetchOrgProjects(
  orgData: ReadOrgProjectsRequest
): Promise<Array<Project>> {
  const response = await webServerClient.get("/projects", {
    params: orgData,
  });
  return response.data;
}
