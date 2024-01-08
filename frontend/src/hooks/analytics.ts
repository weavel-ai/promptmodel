import { useQuery } from "@tanstack/react-query";
import { useFunctionModel } from "./useFunctionModel";
import { useChatModel } from "./useChatModel";
import { fetchDailyRunLogMetrics } from "@/apis/metrics/fetchDailyRunLogMetrics";
import { fetchDailyChatLogMetrics } from "@/apis/metrics/fetchDailyChatLogMetrics";
import { useProject } from "./useProject";
import { fetchProjectDailyRunLogMetrics } from "@/apis/metrics/fetchProjectDailyRunLogMetrics";

export const useProjectDailyRunLogMetrics = (
  startDay: string,
  endDay: string
) => {
  const { projectUuid } = useProject();

  const { data: projectDailyRunLogMetrics } = useQuery({
    queryKey: [
      "projectDailyRunLogMetrics",
      {
        projectUuid: projectUuid,
        startDay: startDay,
        endDay: endDay,
      },
    ],
    queryFn: async () =>
      await fetchProjectDailyRunLogMetrics({
        project_uuid: projectUuid,
        start_day: startDay,
        end_day: endDay,
      }),
    enabled: !!projectUuid,
  });

  return {
    projectDailyRunLogMetrics,
  };
};

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
