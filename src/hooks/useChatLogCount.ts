import { useSupabaseClient } from "@/apis/base";
import { useQuery } from "@tanstack/react-query";
import { useProject } from "./useProject";
import { fetchChatLogsCount } from "@/apis/chatLog";

export const useChatLogCount = () => {
  const { supabase } = useSupabaseClient();
  const { projectUuid } = useProject();

  const { data: chatLogCountData, refetch: refetchChatLogCountData } = useQuery(
    {
      queryKey: ["chatLogCountData", { projectUuid: projectUuid }],
      queryFn: async () => await fetchChatLogsCount(supabase, projectUuid),
      enabled: !!supabase && !!projectUuid,
    }
  );

  return {
    chatLogCountData,
    refetchChatLogCountData,
  };
};
