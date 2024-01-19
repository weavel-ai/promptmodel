import { deleteOrganizationLLMProviderConfig } from "@/apis/organizations/deleteOrganizationLLMProviderConfig";
import { fetchOrganizationConfiguredLLMProviders } from "@/apis/organizations/fetchOrganizationLLMProviderKeys";
import { upsertOrganizationLLMProviderConfig } from "@/apis/organizations/upsertOrganizationLLMProviderConfig";
import { env } from "@/constants";
import {
  DeleteOrganizationLLMProviderConfig,
  UpsertOrganizationLLMProviderConfig,
} from "@/types/Organization";
import { useOrganization as useClerkOrganization } from "@clerk/nextjs";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useAuth } from "./useAuth";

type NextOrganization = {
  id: string;
  name: string;
  slug: string | null;
};

type NextOrgReturn = {
  isLoaded: boolean;
  organization: NextOrganization;
};

type ClerkOrgReturn = ReturnType<typeof useClerkOrganization>;

type OrgReturn = NextOrgReturn | ClerkOrgReturn;

function useNextOrganization(): NextOrgReturn {
  const { isSignedIn } = useAuth();

  return {
    isLoaded: true,
    organization: {
      id: isSignedIn && "org_selfhosted",
      name: isSignedIn && env.ORG_NAME,
      slug: isSignedIn && env.ORG_SLUG,
    },
  };
}

const _useOrganization: () => OrgReturn = env.SELF_HOSTED
  ? useNextOrganization
  : useClerkOrganization;

export function useOrganization() {
  const org: OrgReturn = _useOrganization();

  const {
    data: configuredLLMProviderList,
    refetch: refetchConfiguredLLMProviderList,
  } = useQuery({
    queryKey: ["configuredLLMProviderList", org.organization?.id],
    queryFn: async () =>
      await fetchOrganizationConfiguredLLMProviders({
        organization_id: org.organization?.id,
      }),
    enabled: !!org.organization?.id,
  });

  const {
    mutate: upsertLLMProviderConfig,
    status: upsertLLMProviderConfigStatus,
  } = useMutation({
    mutationKey: ["updateConfiguredLLMProviderList", org.organization?.id],
    mutationFn: (
      data: Omit<UpsertOrganizationLLMProviderConfig, "organization_id">
    ) =>
      upsertOrganizationLLMProviderConfig({
        organization_id: org.organization?.id,
        ...data,
      }),
    onSuccess: () => refetchConfiguredLLMProviderList(),
  });

  const { mutate: deleteLLMProviderConfig } = useMutation({
    mutationKey: ["deleteConfiguredLLMProviderList", org.organization?.id],
    mutationFn: (
      data: Omit<DeleteOrganizationLLMProviderConfig, "organization_id">
    ) =>
      deleteOrganizationLLMProviderConfig({
        organization_id: org.organization?.id,
        ...data,
      }),
    onSuccess: () => refetchConfiguredLLMProviderList(),
  });

  return {
    ...org,
    configuredLLMProviderList,
    upsertLLMProviderConfig,
    upsertLLMProviderConfigStatus,
    deleteLLMProviderConfig,
  };
}

// export function useOrganization() {
//   return env.SELF_HOSTED ? useNextOrganization() : useClerkOrganization();
// }
