import { webServerClient } from "@/apis/base";
import { CreateProjectRequest, Project } from "@/types/Project";

/**
 * Creates a new project in the system.
 * @param projectData - The data required to create a new project.
 * @returns A promise that resolves to the Project interface.
 */
export async function createProject(
  projectData: CreateProjectRequest
): Promise<Project> {
  const response = await webServerClient.post("/projects", projectData);
  return response.data;
}
