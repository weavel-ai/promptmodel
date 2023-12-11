import { railwayWebClient } from "@/apis/base";
import { Project, ReadProjectRequest } from "@/types/Project";

/**
 * Reads data for a project.
 * @param projectData - The data required to fetch a project.
 * @returns A promise that resolves to the Project interface.
 */
export async function fetchProject(
  projectData: ReadProjectRequest
): Promise<Project> {
  const response = await railwayWebClient.get(`/projects/${projectData?.uuid}`);
  return response.data;
}
