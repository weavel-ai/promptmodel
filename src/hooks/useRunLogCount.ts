import { useSupabaseClient } from "@/apis/supabase";
import { useQuery } from "@tanstack/react-query";
import { useProject } from "./useProject";
import { fetchProjectRunLogsCount } from "@/apis/run_logs";

export const useRunLogCount = () => {
  const { projectUuid } = useProject();

  const { data: runLogCountData, refetch: refetchRunLogCountData } = useQuery({
    queryKey: ["runLogsCount", { projectUuid: projectUuid }],
    queryFn: async () =>
      await fetchProjectRunLogsCount({ project_uuid: projectUuid }),
    enabled: !!projectUuid,
  });
  return {
    runLogCountData,
    refetchRunLogCountData,
  };
};
