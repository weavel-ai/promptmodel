import { fetchVersionRunLogs } from "@/apis/run_logs";
import { useQuery } from "@tanstack/react-query";

export const useRunLogs = (versionUuid: string) => {
  const { data: runLogData, refetch: refetchRunLogData } = useQuery({
    queryKey: ["runLogData", { versionUuid: versionUuid }],
    queryFn: async () =>
      await fetchVersionRunLogs({ function_model_version_uuid: versionUuid }),
    enabled: !!versionUuid && !versionUuid?.startsWith("DRAFT"),
  });

  return {
    runLogData,
    refetchRunLogData,
  };
};
