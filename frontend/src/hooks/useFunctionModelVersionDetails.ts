import { fetchFunctionModelVersion } from "@/apis/function_model_versions";
import { fetchPrompts } from "@/apis/prompts";
import { useQuery } from "@tanstack/react-query";

export const useFunctionModelVersionDetails = (versionUuid: string) => {
  const { data: promptListData } = useQuery({
    queryKey: ["promptListData", { versionUuid: versionUuid }],
    queryFn: async () =>
      await fetchPrompts({ function_model_version_uuid: versionUuid }),
    enabled: !!versionUuid,
  });

  const { data: functionModelVersionData } = useQuery({
    queryKey: ["functionModelVersionData", { uuid: versionUuid }],
    queryFn: async () => await fetchFunctionModelVersion({ uuid: versionUuid }),
    enabled: !!versionUuid,
  });

  return {
    promptListData,
    functionModelVersionData,
  };
};
