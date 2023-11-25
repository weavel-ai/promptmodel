import { useSupabaseClient } from "@/apis/base";
import { fetchVersionRunLogs } from "@/apis/runlog";
import { useQuery } from "@tanstack/react-query";

export const useRunLogs = (versionUuid: string) => {
  const { createSupabaseClient } = useSupabaseClient();

  const { data: runLogData, refetch: refetchRunLogData } = useQuery({
    queryKey: ["runLogData", { versionUuid: versionUuid }],
    queryFn: async () =>
      await fetchVersionRunLogs(await createSupabaseClient(), versionUuid),
    enabled: versionUuid != undefined && versionUuid != null,
  });

  return {
    runLogData,
    refetchRunLogData,
  };
};
