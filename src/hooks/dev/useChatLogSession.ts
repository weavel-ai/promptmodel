import { fetchRunLogs as fetchLocalRunLogs } from "@/apis/dev";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { useDevBranch } from "../useDevBranch";
import { useSupabaseClient } from "@/apis/base";
import { fetchRunLogs } from "@/apis/devCloud";
import { fetchChatLogSessions, fetchSessionChatLogs } from "@/apis/chatLog";

export const NEW_CHAT_LABEL = "New chat";

export const useChatLogSessions = (versionUuid: string) => {
  const params = useParams();
  const { createSupabaseClient } = useSupabaseClient();
  const { devBranchData } = useDevBranch();

  const {
    data: chatLogSessionListData,
    refetch: refetchChatLogSessionListData,
  } = useQuery({
    queryKey: ["chatLogSessionListData", { versionUuid: versionUuid }],
    queryFn: async () => {
      let sessions: Record<string, any>[];
      if (versionUuid == "new") {
        sessions = [];
      } else if (devBranchData == null) {
        sessions = await fetchChatLogSessions({
          supabaseClient: await createSupabaseClient(),
          versionUuid: versionUuid,
        });
      } else if (devBranchData?.cloud) {
        sessions = await fetchChatLogSessions({
          supabaseClient: await createSupabaseClient(),
          versionUuid: versionUuid,
          devUuid: devBranchData?.uuid,
        });
      } else {
        sessions = [];
      }
      sessions.unshift({ uuid: null, name: NEW_CHAT_LABEL, created_at: null });
      return sessions;
    },
    enabled: versionUuid != undefined && versionUuid != null,
    //  && devBranchData != null,
  });

  return {
    chatLogSessionListData,
    refetchChatLogSessionListData,
  };
};
