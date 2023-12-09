import { railwayWebClient } from "@/apis/base";
import { Organization, UpdateOrganizationRequest } from "@/types/Organization";

/**
 * Updates an organization in the system.
 * @param organizationData - The data required to update an organization.
 * @returns A promise that resolves to the Organization interface.
 */
export async function updateOrganization(
  organizationData: UpdateOrganizationRequest
): Promise<Organization> {
  const response = await railwayWebClient.patch(
    "/organizations",
    organizationData
  );
  return response.data;
}
