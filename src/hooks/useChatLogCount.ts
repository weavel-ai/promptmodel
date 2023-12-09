import { useQuery } from "@tanstack/react-query";
import { useProject } from "./useProject";
import { fetchProjectChatLogsCount } from "@/apis/chat_logs";

export const useChatLogCount = () => {
  const { projectUuid } = useProject();

  const { data: chatLogCountData, refetch: refetchChatLogCountData } = useQuery(
    {
      queryKey: ["chatLogCountData", { projectUuid: projectUuid }],
      queryFn: async () =>
        await fetchProjectChatLogsCount({ project_uuid: projectUuid }),
      enabled: !!projectUuid,
    }
  );

  return {
    chatLogCountData,
    refetchChatLogCountData,
  };
};
