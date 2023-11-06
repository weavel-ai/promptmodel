import { fetchRunLogs as fetchLocalRunLogs } from "@/apis/dev";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { useDevBranch } from "../useDevBranch";
import { useSupabaseClient } from "@/apis/base";
import { fetchRunLogs } from "@/apis/devCloud";

export const useRunLogs = (versionUuid: string) => {
  const params = useParams();
  const { createSupabaseClient } = useSupabaseClient();
  const { devBranchData } = useDevBranch();

  const { data: runLogData, refetch: refetchRunLogData } = useQuery({
    queryKey: ["runLogData", "dev", { uuid: versionUuid }],
    queryFn: async () => {
      if (versionUuid == "new") return [];
      else if (devBranchData?.cloud) {
        return await fetchRunLogs(
          await createSupabaseClient(),
          devBranchData?.uuid,
          versionUuid
        );
      } else {
        return await fetchLocalRunLogs(
          params?.projectUuid as string,
          params?.devName as string,
          versionUuid
        );
      }
    },
    enabled:
      versionUuid != undefined && versionUuid != null && devBranchData != null,
  });

  return {
    runLogData,
    refetchRunLogData,
  };
};
