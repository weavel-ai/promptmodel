import { railwayWebClient } from "@/apis/base";
import { Organization, ReadOrganizationRequest } from "@/types/Organization";

/**
 * Reads organization information.
 * @param organizationData - The data required to read an organization.
 * @returns A promise that resolves to the Organization interface.
 */
export async function fetchOrganization(
  organizationData: ReadOrganizationRequest
): Promise<Organization | null> {
  const response = await railwayWebClient.get(
    `/organizations/${organizationData.organization_id}`
  );
  return response.data;
}
