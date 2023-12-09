import { fetchVersionRunLogs } from "@/apis/run_logs";
import { useSupabaseClient } from "@/apis/supabase";
import { useQuery } from "@tanstack/react-query";

export const useRunLogs = (versionUuid: string) => {
  const { supabase } = useSupabaseClient();

  const { data: runLogData, refetch: refetchRunLogData } = useQuery({
    queryKey: ["runLogData", { versionUuid: versionUuid }],
    queryFn: async () =>
      await fetchVersionRunLogs({ prompt_model_version_uuid: versionUuid }),
    enabled: !!versionUuid,
  });

  return {
    runLogData,
    refetchRunLogData,
  };
};
