import { webServerClient } from "@/apis/base";
import { Organization, UpdateOrganizationRequest } from "@/types/Organization";

/**
 * Updates an organization in the system.
 * @param organizationData - The data required to update an organization.
 * @returns A promise that resolves to the Organization interface.
 */
export async function updateOrganization(
  organizationData: UpdateOrganizationRequest
): Promise<Organization> {
  const { organization_id, ...params } = organizationData;
  const response = await webServerClient.patch(
    `/organizations/${organization_id}?`,
    {},
    {
      params: params,
    }
  );
  return response.data;
}
