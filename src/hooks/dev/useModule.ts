import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { fetchModules, updateDevBranchSync } from "@/apis/dev";
import { useSupabaseClient } from "@/apis/base";

export const useModule = () => {
  const params = useParams();
  const { createSupabaseClient } = useSupabaseClient();

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
      await fetchModules(
        params?.projectUuid as string,
        params?.devName as string
      ),
    onSettled: async (data) => {
      await updateDevBranchSync(
        await createSupabaseClient(),
        params?.projectUuid as string,
        params?.devName as string,
        true
      );
    },
    enabled: Boolean(params?.projectUuid && params?.devName),
  });

  return {
    moduleListData,
    refetchModuleListData,
  };
};
