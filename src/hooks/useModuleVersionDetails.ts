import { useSupabaseClient } from "@/apis/base";
import { fetchModuleVersion } from "@/apis/moduleVersion";
import { fetchPrompts } from "@/apis/prompt";
import { useQuery } from "@tanstack/react-query";

export const useModuleVersionDetails = (versionUuid: string) => {
  const { createSupabaseClient } = useSupabaseClient();

  const { data: promptListData } = useQuery({
    queryKey: ["promptListData", { moduleVersionUuid: versionUuid }],
    queryFn: async () =>
      await fetchPrompts(await createSupabaseClient(), versionUuid),
    enabled: versionUuid != undefined && versionUuid != null,
  });

  const { data: moduleVersionData } = useQuery({
    queryKey: ["moduleVersionData", { uuid: versionUuid }],
    queryFn: async () =>
      await fetchModuleVersion(await createSupabaseClient(), versionUuid),
    enabled: versionUuid != undefined && versionUuid != null,
  });

  return {
    promptListData,
    moduleVersionData,
  };
};

