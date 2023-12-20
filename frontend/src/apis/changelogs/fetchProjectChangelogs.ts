import { webServerClient } from "@/apis/base";
import { Changelog, ReadProjectChangelogsRequest } from "@/types/Changelog";

/**
 * Reads a Project's Changelogs.
 * @param requestData - The data required to fetch Changelogs.
 * @returns A promise that resolves to a list of the Changelog interface.
 */
export async function fetchProjectChangelogs(
  requestData: ReadProjectChangelogsRequest
): Promise<Array<Changelog>> {
  const response = await webServerClient.get("/project_changelogs", {
    params: requestData,
  });
  return response.data;
}
