import { webServerClient } from "@/apis/base";
import { Organization, CreateOrganizationRequest } from "@/types/Organization";

/**
 * Creates a new organization in the system.
 * @param organizationData - The data required to create a new organization.
 * @returns A promise that resolves to the Organization interface.
 */
export async function createOrganization(
  organizationData: CreateOrganizationRequest
): Promise<Organization> {
  const response = await webServerClient.post(
    "/organizations",
    organizationData
  );
  return response.data;
}
