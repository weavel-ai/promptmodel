import { webServerClient } from "@/apis/base";
import { CliAccess, UpdateCliAccessRequest } from "@/types/CliAccess";

/**
 * Reads a CliAccess's information.
 * @param requestData - The data required to update a CliAccess.
 * @returns A promise that resolves to a CliAccess interface.
 */
export async function updateCliAccess(
  requestData: UpdateCliAccessRequest
): Promise<CliAccess> {
  const response = await webServerClient.patch("/cli_access", requestData);
  return response.data;
}
