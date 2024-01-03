import { webServerClient } from "@/apis/base";
import { UpsertOrganizationLLMProviderConfig } from "@/types/Organization";

/**
 * Upserts an organization's LLM provider configuration.
 * @param requestData @type {UpsertOrganizationLLMProviderConfig}
 */
export async function upsertOrganizationLLMProviderConfig(
  requestData: UpsertOrganizationLLMProviderConfig
): Promise<void> {
  const { organization_id, ...body } = requestData;
  await webServerClient.post(
    `/organizations/${organization_id}/llm_providers`,
    body
  );
}
