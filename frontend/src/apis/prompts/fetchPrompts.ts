import { webServerClient } from "@/apis/base";
import { Prompt, ReadPromptsRequest } from "@/types/Prompt";

/**
 * Reads a project's Prompts.
 * @param requestData - The data required to fetch Prompts.
 * @returns A promise that resolves to a list of the Prompt interface.
 */
export async function fetchPrompts(
  requestData: ReadPromptsRequest
): Promise<Array<Prompt>> {
  const response = await webServerClient.get("/prompts", {
    params: requestData,
  });
  return response.data;
}
