import { useSupabaseClient } from "@/apis/base";
import { fetchRunLogsCount, fetchVersionRunLogs } from "@/apis/runlog";
import { useQuery } from "@tanstack/react-query";
import { useProject } from "./useProject";

export const useRunLogCount = () => {
  const { createSupabaseClient } = useSupabaseClient();
  const { projectUuid } = useProject();

  const { data: runLogCountData, refetch: refetchRunLogCountData } = useQuery({
    queryKey: ["runLogsCount", { projectUuid: projectUuid }],
    queryFn: async () =>
      await fetchRunLogsCount(await createSupabaseClient(), projectUuid),
    enabled: !!projectUuid,
  });
  return {
    runLogCountData,
    refetchRunLogCountData,
  };
};
