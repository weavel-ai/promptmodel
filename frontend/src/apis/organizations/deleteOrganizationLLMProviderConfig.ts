import { webServerClient } from "@/apis/base";
import { DeleteOrganizationLLMProviderConfig } from "@/types/Organization";

/**
 * Deletes an organization's LLM provider configuration.
 * @param requestData @type {DeleteOrganizationLLMProviderConfig}
 */
export async function deleteOrganizationLLMProviderConfig(
  requestData: DeleteOrganizationLLMProviderConfig
): Promise<void> {
  const { organization_id, ...params } = requestData;
  await webServerClient.delete(
    `/organizations/${organization_id}/llm_providers`,
    {
      params: params,
    }
  );
}
