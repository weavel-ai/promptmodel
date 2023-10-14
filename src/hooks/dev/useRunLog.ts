import { fetchRunLogs } from "@/apis/dev";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";

export const useRunLog = (versionUuid: string) => {
  const params = useParams();

  const { data: runLogData, refetch: refetchRunLogData } = useQuery({
    queryKey: ["runLogData", "dev", { uuid: versionUuid }],
    queryFn: async () =>
      await fetchRunLogs(
        params?.projectUuid as string,
        params?.devName as string,
        versionUuid
      ),
    enabled: versionUuid != undefined && versionUuid != null,
  });

  return {
    runLogData,
    refetchRunLogData,
  };
};
