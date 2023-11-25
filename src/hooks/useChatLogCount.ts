import { useSupabaseClient } from "@/apis/base";
import { useQuery } from "@tanstack/react-query";
import { useProject } from "./useProject";
import { fetchChatLogsCount } from "@/apis/chatLog";

export const useChatLogCount = () => {
  const { createSupabaseClient } = useSupabaseClient();
  const { projectUuid } = useProject();

  const { data: chatLogCountData, refetch: refetchChatLogCountData } = useQuery(
    {
      queryKey: ["chatLogCountData", { projectUuid: projectUuid }],
      queryFn: async () =>
        await fetchChatLogsCount(await createSupabaseClient(), projectUuid),
      enabled: !!projectUuid,
    }
  );

  return {
    chatLogCountData,
    refetchChatLogCountData,
  };
};
