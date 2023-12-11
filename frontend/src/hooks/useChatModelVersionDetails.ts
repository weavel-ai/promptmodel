import { fetchChatModelVersion } from "@/apis/chat_model_versions";
import { useQuery } from "@tanstack/react-query";

export const useChatModelVersionDetails = (versionUuid: string) => {
  const { data: chatModelVersionData } = useQuery({
    queryKey: ["chatModelVersionData", { uuid: versionUuid }],
    queryFn: async () => await fetchChatModelVersion({ uuid: versionUuid }),
    enabled: !!versionUuid,
  });

  return {
    chatModelVersionData,
  };
};
