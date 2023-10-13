import { useSupabaseClient } from "@/apis/base";
import { fetchRunLogs } from "@/apis/runlog";
import { useQuery } from "@tanstack/react-query";

export const useRunLog = (versionUuid: string) => {
  const { createSupabaseClient } = useSupabaseClient();

  const { data: runLogData } = useQuery({
    queryKey: ["runLogData", { uuid: versionUuid }],
    queryFn: async () =>
      await fetchRunLogs(await createSupabaseClient(), versionUuid),
    enabled: versionUuid != undefined && versionUuid != null,
  });

  return {
    runLogData,
  };
};
