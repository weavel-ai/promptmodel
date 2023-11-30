import { useQuery } from "@tanstack/react-query";
import { useSupabaseClient } from "@/apis/base";
import { ChatLog, fetchSessionChatLogs } from "@/apis/chatLog";
import { useEffect, useState } from "react";

export const useSessionChatLogs = (sessionUuid: string | null) => {
  const { createSupabaseClient } = useSupabaseClient();
  const [chatLogListData, setChatLogListData] = useState<ChatLog[] | any[]>([]);

  const { data: fetchedChatLogListData, refetch: refetchChatLogListData } =
    useQuery({
      queryKey: ["chatLogListData", { sessionUuid: sessionUuid }],
      queryFn: async () =>
        await fetchSessionChatLogs(await createSupabaseClient(), sessionUuid),

      enabled: sessionUuid != undefined && sessionUuid != null,
    });

  useEffect(() => {
    if (sessionUuid == null) {
      setChatLogListData([]);
    } else if (fetchedChatLogListData) {
      setChatLogListData(fetchedChatLogListData);
    }
  }, [fetchedChatLogListData, sessionUuid]);

  function resetChatLogListData() {
    setChatLogListData([]);
  }

  return {
    chatLogListData,
    setChatLogListData,
    refetchChatLogListData,
    resetChatLogListData,
  };
};
