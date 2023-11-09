import { useSupabaseClient } from "@/apis/base";
import { fetchVersionRunLogs } from "@/apis/runlog";
import { useQuery } from "@tanstack/react-query";

export const useRunLog = (versionUuid: string) => {
  const { createSupabaseClient } = useSupabaseClient();

  const { data: runLogData } = useQuery({
    queryKey: ["runLogData", { uuid: versionUuid }],
    queryFn: async () =>
      await fetchVersionRunLogs(await createSupabaseClient(), versionUuid),
    enabled: versionUuid != undefined && versionUuid != null,
  });

  return {
    runLogData,
  };
};
