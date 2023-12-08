import { useSupabaseClient } from "@/apis/supabase";
import { fetchRunLogsCount, fetchVersionRunLogs } from "@/apis/runlog";
import { useQuery } from "@tanstack/react-query";
import { useProject } from "./useProject";

export const useRunLogCount = () => {
  const { supabase } = useSupabaseClient();
  const { projectUuid } = useProject();

  const { data: runLogCountData, refetch: refetchRunLogCountData } = useQuery({
    queryKey: ["runLogsCount", { projectUuid: projectUuid }],
    queryFn: async () => await fetchRunLogsCount(supabase, projectUuid),
    enabled: !!supabase && !!projectUuid,
  });
  return {
    runLogCountData,
    refetchRunLogCountData,
  };
};
