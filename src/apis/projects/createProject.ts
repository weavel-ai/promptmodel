import { railwayWebClient } from "@/apis/base";
import { CreateProjectRequest, Project } from "@/types/Project";

/**
 * Creates a new project in the system.
 * @param projectData - The data required to create a new project.
 * @returns A promise that resolves to the Project interface.
 */
export async function createProject(
  projectData: CreateProjectRequest
): Promise<Project> {
  const response = await railwayWebClient.post("/projects", projectData);
  if (response.status !== 201) {
    throw new Error("Error creating project: " + response.status);
  }
  return response.data;
}
