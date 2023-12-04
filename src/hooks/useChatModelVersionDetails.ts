import { useSupabaseClient } from "@/apis/base";
import { fetchChatModelVersion } from "@/apis/chatModelVersion";
import { useQuery } from "@tanstack/react-query";

export const useChatModelVersionDetails = (versionUuid: string) => {
  const { supabase } = useSupabaseClient();

  const { data: chatModelVersionData } = useQuery({
    queryKey: ["chatModelVersionData", { uuid: versionUuid }],
    queryFn: async () => await fetchChatModelVersion(supabase, versionUuid),
    enabled: !!supabase && !!versionUuid,
  });

  return {
    chatModelVersionData,
  };
};
