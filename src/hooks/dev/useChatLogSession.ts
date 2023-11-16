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
    queryKey: ["chatLogSessionListData", "dev", { versionUuid: versionUuid }],
    queryFn: async () => {
      let sessions: Record<string, any>[];
      if (versionUuid == "new") {
        sessions = [];
      } else if (devBranchData?.cloud) {
        sessions = await fetchChatLogSessions(
          await createSupabaseClient(),
          versionUuid,
          devBranchData?.uuid
        );
      } else {
        sessions = [];
      }
      sessions.unshift({ uuid: null, name: NEW_CHAT_LABEL, created_at: null });
      return sessions;
    },
    enabled:
      versionUuid != undefined && versionUuid != null && devBranchData != null,
  });

  return {
    chatLogSessionListData,
    refetchChatLogSessionListData,
  };
};
