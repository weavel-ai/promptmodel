import { useSupabaseClient } from "@/apis/base";
import { fetchVersionRunLogs } from "@/apis/runlog";
import { useQuery } from "@tanstack/react-query";

export const useRunLogs = (versionUuid: string) => {
  const { supabase } = useSupabaseClient();

  const { data: runLogData, refetch: refetchRunLogData } = useQuery({
    queryKey: ["runLogData", { versionUuid: versionUuid }],
    queryFn: async () => await fetchVersionRunLogs(supabase, versionUuid),
    enabled: !!supabase && !!versionUuid,
  });

  return {
    runLogData,
    refetchRunLogData,
  };
};
