import { useSupabaseClient } from "@/apis/base";
import { fetchChatLogSessions } from "@/apis/chatLog";
import { useQuery } from "@tanstack/react-query";

export const useRunLog = (versionUuid: string) => {
  const { createSupabaseClient } = useSupabaseClient();

  const { data: chatLogSessionListData } = useQuery({
    queryKey: ["chatLogSessionListData", { versionUuid: versionUuid }],
    queryFn: async () =>
      await fetchChatLogSessions(await createSupabaseClient(), versionUuid),
    enabled: versionUuid != undefined && versionUuid != null,
  });

  return {
    chatLogSessionListData,
  };
};
