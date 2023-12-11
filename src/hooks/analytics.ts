import { useQuery } from "@tanstack/react-query";
import { useFunctionModel } from "./useFunctionModel";
import { useChatModel } from "./useChatModel";
import { fetchDailyRunLogMetrics } from "@/apis/metrics/fetchDailyRunLogMetrics";
import { fetchDailyChatLogMetrics } from "@/apis/metrics/fetchDailyChatLogMetrics";

export const useDailyRunLogMetrics = (startDay: string, endDay: string) => {
  const { functionModelUuid } = useFunctionModel();

  const { data: dailyRunLogMetrics } = useQuery({
    queryKey: [
      "dailyRunLogMetrics",
      {
        functionModelUuid: functionModelUuid,
        startDay: startDay,
        endDay: endDay,
      },
    ],
    queryFn: async () =>
      await fetchDailyRunLogMetrics({
        function_model_uuid: functionModelUuid,
        start_day: startDay,
        end_day: endDay,
      }),
    enabled: !!functionModelUuid,
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
