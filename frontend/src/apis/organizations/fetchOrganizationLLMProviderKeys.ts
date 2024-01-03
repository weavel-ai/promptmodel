import { webServerClient } from "@/apis/base";
import {
  Organization,
  ReadOrganizationConfiguredLLMProviders,
  ReadOrganizationRequest,
} from "@/types/Organization";

/**
 * Reads an organization's configured LLM providers..
 * @param organizationData - The data required to read an organization's configured LLM providers.
 * @returns A promise that resolves to an array of strings (provider names).
 */
export async function fetchOrganizationConfiguredLLMProviders(
  organizationData: ReadOrganizationConfiguredLLMProviders
): Promise<Array<string> | null> {
  const response = await webServerClient.get(
    `/organizations/${organizationData.organization_id}/llm_providers`
  );
  return response.data;
}
