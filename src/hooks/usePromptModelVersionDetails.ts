import { useSupabaseClient } from "@/apis/base";
import { fetchPromptModelVersion } from "@/apis/promptModelVersion";
import { fetchPrompts } from "@/apis/prompt";
import { useQuery } from "@tanstack/react-query";

export const usePromptModelVersionDetails = (versionUuid: string) => {
  const { supabase } = useSupabaseClient();

  const { data: promptListData } = useQuery({
    queryKey: ["promptListData", { versionUuid: versionUuid }],
    queryFn: async () => await fetchPrompts(supabase, versionUuid),
    enabled: !!supabase && !!versionUuid,
  });

  const { data: promptModelVersionData } = useQuery({
    queryKey: ["promptModelVersionData", { uuid: versionUuid }],
    queryFn: async () => await fetchPromptModelVersion(supabase, versionUuid),
    enabled: !!supabase && !!versionUuid,
  });

  return {
    promptListData,
    promptModelVersionData,
  };
};
