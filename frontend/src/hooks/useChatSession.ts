import { fetchChatSessions } from "@/apis/chat_sessions";
import { useQuery } from "@tanstack/react-query";

export const NEW_CHAT_LABEL = "New chat";

export const useChatSessions = (versionUuid: string) => {
  const { data: chatSessionListData, refetch: refetchChatSessionListData } =
    useQuery({
      queryKey: ["chatSessionListData", { versionUuid: versionUuid }],
      queryFn: async () => {
        let sessions: Record<string, any>[] = [
          { uuid: null, name: NEW_CHAT_LABEL, created_at: null },
        ];
        if (versionUuid != "new") {
          sessions.push(
            ...(await fetchChatSessions({
              chat_model_version_uuid: versionUuid,
            }))
          );
        }
        return sessions;
      },
      enabled: !!versionUuid,
    });

  return {
    chatSessionListData,
    refetchChatSessionListData,
  };
};
