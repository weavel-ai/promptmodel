import { useQuery } from "@tanstack/react-query";
import { useProject } from "./useProject";
import { fetchProjectChatMessagesCount } from "@/apis/chat_messages";

export const useChatLogCount = () => {
  const { projectUuid } = useProject();

  const { data: chatMessagesCountData, refetch: refetchChatMessagesCountData } =
    useQuery({
      queryKey: ["chatMessagesCountData", { projectUuid: projectUuid }],
      queryFn: async () =>
        await fetchProjectChatMessagesCount({ project_uuid: projectUuid }),
      enabled: !!projectUuid,
    });

  return {
    chatMessagesCountData,
    refetchChatMessagesCountData,
  };
};
