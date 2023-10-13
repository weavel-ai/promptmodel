import { useSupabaseClient } from "@/apis/base";
import { fetchOrganization } from "@/apis/organization";
import { fetchProject, fetchProjects } from "@/apis/project";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { useProject } from "./useProject";
import { fetchModules } from "@/apis/module";
import { fetchModuleVersions } from "@/apis/moduleVersion";

export const useModuleVersion = () => {
  const params = useParams();
  const { createSupabaseClient } = useSupabaseClient();

  const { data: versionListData, refetch: refetchVersionListData } = useQuery({
    queryKey: ["versionListData", { moduleUuid: params?.moduleUuid }],
    queryFn: async () =>
      await fetchModuleVersions(
        await createSupabaseClient(),
        params?.moduleUuid as string
      ),
    enabled: params?.moduleUuid != undefined && params?.moduleUuid != null,
  });

  return {
    moduleUuid: params?.moduleUuid as string,
    versionListData,
    refetchVersionListData
  };
};
