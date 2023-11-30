import { useSupabaseClient } from "@/apis/base";
import { fetchOrganization } from "@/apis/organization";
import { useOrganization } from "@clerk/nextjs";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";

export const useOrgData = () => {
  const { organization } = useOrganization();
  const { createSupabaseClient } = useSupabaseClient();

  const { data: orgData, refetch: refetchOrgData } = useQuery({
    queryKey: ["organization", { orgId: organization?.id }],
    queryFn: async () => {
      const data = await fetchOrganization(
        await createSupabaseClient(),
        organization?.id
      );
      if (data?.length > 0) {
        return data[0];
      } else {
        return null;
      }
    },
    enabled: organization != undefined && organization != null,
  });

  useEffect(() => {
    refetchOrgData();
  }, [organization?.id]);

  return {
    orgData,
    refetchOrgData,
    orgId: organization?.id,
  };
};
