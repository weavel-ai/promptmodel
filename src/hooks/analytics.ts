import { useQuery } from "@tanstack/react-query";
import { usePromptModel } from "./usePromptModel";
import { useChatModel } from "./useChatModel";
import { fetchDailyRunLogMetrics } from "@/apis/metrics/fetchDailyRunLogMetrics";
import { fetchDailyChatLogMetrics } from "@/apis/metrics/fetchDailyChatLogMetrics";

export const useDailyRunLogMetrics = (startDay: string, endDay: string) => {
  const { promptModelUuid } = usePromptModel();

  const { data: dailyRunLogMetrics } = useQuery({
    queryKey: [
      "dailyRunLogMetrics",
      { promptModelUuid: promptModelUuid, startDay: startDay, endDay: endDay },
    ],
    queryFn: async () =>
      await fetchDailyRunLogMetrics({
        prompt_model_uuid: promptModelUuid,
        start_day: startDay,
        end_day: endDay,
      }),
    enabled: !!promptModelUuid,
  });

  return {
    dailyRunLogMetrics,
  };
};

export const useDailyChatLogMetrics = (startDay, endDay) => {
  const { chatModelUuid } = useChatModel();

  const { data: dailyChatLogMetrics } = useQuery({
    queryKey: [
      "dailyChatLogMetrics",
      { chatModelUuid: chatModelUuid, startDay: startDay, endDay: endDay },
    ],
    queryFn: async () =>
      await fetchDailyChatLogMetrics({
        chat_model_uuid: chatModelUuid,
        start_day: startDay,
        end_day: endDay,
      }),
    enabled: !!chatModelUuid,
  });

  return {
    dailyChatLogMetrics,
  };
};
