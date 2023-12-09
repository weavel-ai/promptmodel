import { useSupabaseClient } from "@/apis/supabase";
import { fetchChatLogSessions } from "@/apis/chatLog";
import { useQuery } from "@tanstack/react-query";

export const NEW_CHAT_LABEL = "New chat";

export const useChatLogSessions = (versionUuid: string) => {
  const { supabase } = useSupabaseClient();

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
            supabaseClient: supabase,
            versionUuid: versionUuid,
          }))
        );
      }
      return sessions;
    },
    enabled: !!supabase && !!versionUuid,
  });

  return {
    chatLogSessionListData,
    refetchChatLogSessionListData,
  };
};
