import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { fetchModuleVersions, updateDevBranchSync } from "@/apis/dev";
import { useSupabaseClient } from "@/apis/base";

export const useModuleVersion = () => {
  const params = useParams();
  const { createSupabaseClient } = useSupabaseClient();

  const { data: versionListData, refetch: refetchVersionListData } = useQuery({
    queryKey: [
      "versionListData",
      "sync",
      {
        moduleUuid: params?.moduleUuid,
        devName: params?.devName,
        projectUuid: params?.projectUuid,
      },
    ],
    queryFn: async () =>
      await fetchModuleVersions(
        params?.projectUuid as string,
        params?.devName as string,
        params?.moduleUuid as string
      ),
    onSettled: async (data) => {
      await updateDevBranchSync(
        await createSupabaseClient(),
        params?.projectUuid as string,
        params?.devName as string,
        true
      );
    },
    enabled: Boolean(
      params?.moduleUuid && params?.devName && params?.projectUuid
    ),
  });

  return {
    moduleUuid: params?.moduleUuid as string,
    versionListData,
    refetchVersionListData,
  };
};
