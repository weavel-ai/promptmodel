import { fetchRunLogs } from "@/apis/dev";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";

export const useRunLogs = (versionUuid: string) => {
  const params = useParams();

  const { data: runLogData, refetch: refetchRunLogData } = useQuery({
    queryKey: ["runLogData", "dev", { uuid: versionUuid }],
    queryFn: async () => {
      if (versionUuid == "new") return [];
      else {
        return await fetchRunLogs(
          params?.projectUuid as string,
          params?.devName as string,
          versionUuid
        );
      }
    },
    enabled: versionUuid != undefined && versionUuid != null,
  });

  return {
    runLogData,
    refetchRunLogData,
  };
};
