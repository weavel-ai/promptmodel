import {
  OrganizationBySlug,
  ReadOrganizationBySlugRequest,
} from "@/types/Organization";
import { webServerClient } from "../base";

export async function fetchOrganizationBySlug(
  organizationData: ReadOrganizationBySlugRequest
): Promise<OrganizationBySlug> {
  const response = await webServerClient.get(
    `/organizations/slug/${organizationData?.slug}`
  );

  return response.data;
}
