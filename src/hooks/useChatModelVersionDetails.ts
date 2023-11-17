import { useSupabaseClient } from "@/apis/base";
import { fetchChatModelVersion } from "@/apis/chatModelVersion";
import { useQuery } from "@tanstack/react-query";

export const useChatModelVersionDetails = (versionUuid: string) => {
  const { createSupabaseClient } = useSupabaseClient();

  const { data: chatModelVersionData } = useQuery({
    queryKey: ["chatModelVersionData", { uuid: versionUuid }],
    queryFn: async () =>
      await fetchChatModelVersion(await createSupabaseClient(), versionUuid),
    enabled: versionUuid != undefined && versionUuid != null,
  });

  return {
    chatModelVersionData,
  };
};
