import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ChatMessage } from "@/types/ChatMessage";
import { fetchSessionChatMessages } from "@/apis/chat_messages";

export const useSessionChatMessages = (sessionUuid: string | null) => {
  const [chatMessageListData, setChatMessageListData] = useState<
    Array<ChatMessage>
  >([]);

  const { data: fetchedChatLogListData, refetch: refetchChatMessageListData } =
    useQuery({
      queryKey: ["chatMessageListData", { sessionUuid: sessionUuid }],
      queryFn: async () =>
        await fetchSessionChatMessages({
          chat_session_uuid: sessionUuid,
          page: 1,
          rows_per_page: 100,
        }),

      enabled: !!sessionUuid,
    });

  useEffect(() => {
    if (sessionUuid == null) {
      setChatMessageListData([]);
    } else if (fetchedChatLogListData) {
      setChatMessageListData(fetchedChatLogListData);
    }
  }, [fetchedChatLogListData, sessionUuid]);

  function resetChatMessageListData() {
    setChatMessageListData([]);
  }

  return {
    chatMessageListData,
    setChatMessageListData,
    refetchChatMessageListData,
    resetChatMessageListData,
  };
};
