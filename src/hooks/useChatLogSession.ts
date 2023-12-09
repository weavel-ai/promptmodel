import { fetchChatLogSessions } from "@/apis/chat_log_sessions";
import { useQuery } from "@tanstack/react-query";

export const NEW_CHAT_LABEL = "New chat";

export const useChatLogSessions = (versionUuid: string) => {
  const {
    data: chatLogSessionListData,
    refetch: refetchChatLogSessionListData,
  } = useQuery({
    queryKey: ["chatLogSessionListData", { versionUuid: versionUuid }],
    queryFn: async () => {
      let sessions: Record<string, any>[] = [
        { uuid: null, name: NEW_CHAT_LABEL, created_at: null },
      ];
      if (versionUuid != "new") {
        sessions.push(
          ...(await fetchChatLogSessions({
            chat_model_version_uuid: versionUuid,
          }))
        );
      }
      return sessions;
    },
    enabled: !!versionUuid,
  });

  return {
    chatLogSessionListData,
    refetchChatLogSessionListData,
  };
};
