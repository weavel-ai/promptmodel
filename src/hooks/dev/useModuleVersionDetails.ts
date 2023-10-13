import { fetchPrompts } from "@/apis/dev";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";

export const useModuleVersionDetails = (versionUuid: string) => {
  const params = useParams();

  const { data: promptListData } = useQuery({
    queryKey: [
      "promptListData",
      { moduleVersionUuid: versionUuid, devName: params?.devName },
    ],
    queryFn: async () =>
      await fetchPrompts(
        params?.projectUuid as string,
        params?.devName as string,
        versionUuid
      ),
    enabled: versionUuid != undefined && versionUuid != null,
  });

  return {
    promptListData,
  };
};
