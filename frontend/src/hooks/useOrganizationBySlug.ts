import { fetchOrganizationBySlug } from "@/apis/organizations/fetchOrganizationBySlug";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";

export const useOrganizationBySlug = () => {
  const params = useParams();

  const {
    data: organizationDataBySlug,
    refetch: refetchOrganizationDataBySlug,
  } = useQuery({
    queryKey: [
      "organizationDataBySlug",
      { orgSlug: params?.org_slug as string },
    ],
    queryFn: async () =>
      await fetchOrganizationBySlug({ slug: params?.org_slug as string }),
    enabled: !!params?.org_slug,
  });

  return {
    organizationDataBySlug,
    refetchOrganizationDataBySlug,
  };
};
