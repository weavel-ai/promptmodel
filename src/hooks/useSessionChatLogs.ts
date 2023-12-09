import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ChatLog } from "@/types/ChatLog";
import { fetchSessionChatLogs } from "@/apis/chat_logs";

export const useSessionChatLogs = (sessionUuid: string | null) => {
  const [chatLogListData, setChatLogListData] = useState<Array<ChatLog>>([]);

  const { data: fetchedChatLogListData, refetch: refetchChatLogListData } =
    useQuery({
      queryKey: ["chatLogListData", { sessionUuid: sessionUuid }],
      queryFn: async () =>
        await fetchSessionChatLogs({
          chat_session_uuid: sessionUuid,
          page: 1,
          rows_per_page: 100,
        }),

      enabled: !!sessionUuid,
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
