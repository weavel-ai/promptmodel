import { fetchPrompts as fetchLocalPrompts } from "@/apis/dev";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { useDevBranch } from "../useDevBranch";
import { fetchPrompts } from "@/apis/devCloud";
import { useSupabaseClient } from "@/apis/base";

export const useModuleVersionDetails = (versionUuid: string) => {
  const params = useParams();
  const { createSupabaseClient } = useSupabaseClient();
  const { devBranchData } = useDevBranch();

  const { data: promptListData } = useQuery({
    queryKey: [
      "promptListData",
      { moduleVersionUuid: versionUuid, devName: params?.devName },
    ],
    queryFn: async () =>
      devBranchData?.cloud
        ? await fetchPrompts(await createSupabaseClient(), versionUuid)
        : await fetchLocalPrompts(
            params?.projectUuid as string,
            params?.devName as string,
            versionUuid
          ),
    enabled:
      versionUuid != undefined && versionUuid != null && devBranchData != null,
  });

  return {
    promptListData,
  };
};
