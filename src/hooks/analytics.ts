import { useSupabaseClient } from "@/apis/base";
import { useQuery } from "@tanstack/react-query";
import { usePromptModel } from "./usePromptModel";
import {
  fetchDailyChatLogMetrics,
  fetchDailyRunLogMetrics,
} from "@/apis/analytics";
import { useChatModel } from "./useChatModel";

export const useDailyRunLogMetrics = (startDay, endDay) => {
  const { promptModelUuid } = usePromptModel();
  const { createSupabaseClient } = useSupabaseClient();

  const { data: dailyRunLogMetrics } = useQuery({
    queryKey: [
      "dailyRunLogMetrics",
      { promptModelUuid: promptModelUuid, startDay: startDay, endDay: endDay },
    ],
    queryFn: async () =>
      await fetchDailyRunLogMetrics(
        await createSupabaseClient(),
        promptModelUuid,
        startDay,
        endDay
      ),
    enabled: promptModelUuid != undefined && promptModelUuid != null,
  });

  return {
    dailyRunLogMetrics,
  };
};

export const useDailyChatLogMetrics = (startDay, endDay) => {
  const { chatModelUuid } = useChatModel();
  const { createSupabaseClient } = useSupabaseClient();

  const { data: dailyChatLogMetrics } = useQuery({
    queryKey: [
      "dailyChatLogMetrics",
      { chatModelUuid: chatModelUuid, startDay: startDay, endDay: endDay },
    ],
    queryFn: async () =>
      await fetchDailyChatLogMetrics(
        await createSupabaseClient(),
        chatModelUuid,
        startDay,
        endDay
      ),
    enabled: chatModelUuid != undefined && chatModelUuid != null,
  });

  return {
    dailyChatLogMetrics,
  };
};
