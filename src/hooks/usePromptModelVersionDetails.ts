import { useSupabaseClient } from "@/apis/base";
import { fetchPromptModelVersion } from "@/apis/promptModelVersion";
import { fetchPrompts } from "@/apis/prompt";
import { useQuery } from "@tanstack/react-query";

export const usePromptModelVersionDetails = (versionUuid: string) => {
  const { createSupabaseClient } = useSupabaseClient();

  const { data: promptListData } = useQuery({
    queryKey: ["promptListData", { versionUuid: versionUuid }],
    queryFn: async () =>
      await fetchPrompts(await createSupabaseClient(), versionUuid),
    enabled: versionUuid != undefined && versionUuid != null,
  });

  const { data: promptModelVersionData } = useQuery({
    queryKey: ["promptModelVersionData", { uuid: versionUuid }],
    queryFn: async () =>
      await fetchPromptModelVersion(await createSupabaseClient(), versionUuid),
    enabled: versionUuid != undefined && versionUuid != null,
  });

  return {
    promptListData,
    promptModelVersionData,
  };
};
