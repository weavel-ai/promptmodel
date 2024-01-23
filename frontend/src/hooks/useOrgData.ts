import { fetchOrganization } from "@/apis/organizations";
import { useOrganization } from "@/hooks/auth/useOrganization";
import { useQuery } from "@tanstack/react-query";

export const useOrgData = () => {
  const { organization } = useOrganization();

  const { data: orgData, refetch: refetchOrgData } = useQuery({
    queryKey: ["organization", { orgId: organization?.id }],
    queryFn: async () => {
      const data = await fetchOrganization({
        organization_id: organization?.id,
      });
      if (!!data) {
        return {
          id: data.organization_id,
          name: data.name,
          slug: data.slug,
        };
      }
    },
    enabled: !!organization,
  });

  return {
    orgData,
    refetchOrgData,
    orgId: organization?.id,
  };
};
