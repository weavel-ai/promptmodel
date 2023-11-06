import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import {
  fetchModules as fetchLocalModules,
  updateDevBranchSync,
} from "@/apis/dev";
import { useSupabaseClient } from "@/apis/base";
import { useDevBranch } from "../useDevBranch";
import { fetchModules as fetchDevCloudModules } from "@/apis/devCloud";

export const useModule = () => {
  const params = useParams();
  const { createSupabaseClient } = useSupabaseClient();
  const { devBranchData } = useDevBranch();

  const { data: moduleListData, refetch: refetchModuleListData } = useQuery({
    queryKey: [
      "devModuleListData",
      "sync",
      {
        projectUuid: params?.projectUuid,
        devName: params?.devName,
      },
    ],
    queryFn: async () =>
      devBranchData?.cloud
        ? await fetchDevCloudModules(
            await createSupabaseClient(),
            devBranchData?.uuid as string,
            params?.projectUuid as string
          )
        : await fetchLocalModules(
            params?.projectUuid as string,
            params?.devName as string
          ),
    onSettled: async (data) => {
      if (devBranchData?.cloud) return;
      await updateDevBranchSync(
        await createSupabaseClient(),
        params?.projectUuid as string,
        params?.devName as string,
        true
      );
    },
    enabled:
      Boolean(params?.projectUuid && params?.devName) && devBranchData != null,
  });

  return {
    moduleListData,
    refetchModuleListData,
  };
};
