import { useSupabaseClient } from "@/apis/base";
import { useQuery } from "@tanstack/react-query";
import { useModule } from "./useModule";
import { fetchDailyRunLogMetrics } from "@/apis/analytics";

export const useDailyRunLogMetrics = (startDay, endDay) => {
  const { moduleUuid } = useModule();
  const { createSupabaseClient } = useSupabaseClient();

  const { data: dailyRunLogMetrics } = useQuery({
    queryKey: [
      "dailyRunLogMetrics",
      { moduleUuid: moduleUuid, startDay: startDay, endDay: endDay },
    ],
    queryFn: async () =>
      await fetchDailyRunLogMetrics(
        await createSupabaseClient(),
        moduleUuid,
        startDay,
        endDay
      ),
    enabled: moduleUuid != undefined && moduleUuid != null,
  });

  return {
    dailyRunLogMetrics,
  };
};
