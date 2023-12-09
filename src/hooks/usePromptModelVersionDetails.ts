import { fetchPromptModelVersion } from "@/apis/prompt_model_versions";
import { fetchPrompts } from "@/apis/prompts";
import { useQuery } from "@tanstack/react-query";

export const usePromptModelVersionDetails = (versionUuid: string) => {
  const { data: promptListData } = useQuery({
    queryKey: ["promptListData", { versionUuid: versionUuid }],
    queryFn: async () =>
      await fetchPrompts({ prompt_model_version_uuid: versionUuid }),
    enabled: !!versionUuid,
  });

  const { data: promptModelVersionData } = useQuery({
    queryKey: ["promptModelVersionData", { uuid: versionUuid }],
    queryFn: async () => await fetchPromptModelVersion({ uuid: versionUuid }),
    enabled: !!versionUuid,
  });

  return {
    promptListData,
    promptModelVersionData,
  };
};
