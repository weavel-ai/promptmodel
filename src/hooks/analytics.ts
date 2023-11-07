import { useSupabaseClient } from "@/apis/base";
import { useQuery } from "@tanstack/react-query";
import { usePromptModel } from "./usePromptModel";
import { fetchDailyRunLogMetrics } from "@/apis/analytics";

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
