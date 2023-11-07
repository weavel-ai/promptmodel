import { useSupabaseClient } from "@/apis/base";
import { fetchOrganization } from "@/apis/organization";
import { fetchProject, fetchProjects } from "@/apis/project";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { useProject } from "./useProject";
import { fetchPromptModels } from "@/apis/promptModel";
import { fetchPromptModelVersions } from "@/apis/promptModelVersion";

export const usePromptModelVersion = () => {
  const params = useParams();
  const { createSupabaseClient } = useSupabaseClient();

  const { data: versionListData, refetch: refetchVersionListData } = useQuery({
    queryKey: ["versionListData", { promptModelUuid: params?.promptModelUuid }],
    queryFn: async () =>
      await fetchPromptModelVersions(
        await createSupabaseClient(),
        params?.promptModelUuid as string
      ),
    enabled:
      params?.promptModelUuid != undefined && params?.promptModelUuid != null,
  });

  return {
    promptModelUuid: params?.promptModelUuid as string,
    versionListData,
    refetchVersionListData,
  };
};
