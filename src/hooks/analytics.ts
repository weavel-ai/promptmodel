import { useSupabaseClient } from "@/apis/supabase";
import { useQuery } from "@tanstack/react-query";
import { usePromptModel } from "./usePromptModel";
import {
  fetchDailyChatLogMetrics,
  fetchDailyRunLogMetrics,
} from "@/apis/analytics";
import { useChatModel } from "./useChatModel";

export const useDailyRunLogMetrics = (startDay, endDay) => {
  const { promptModelUuid } = usePromptModel();
  const { supabase } = useSupabaseClient();

  const { data: dailyRunLogMetrics } = useQuery({
    queryKey: [
      "dailyRunLogMetrics",
      { promptModelUuid: promptModelUuid, startDay: startDay, endDay: endDay },
    ],
    queryFn: async () =>
      await fetchDailyRunLogMetrics(
        supabase,
        promptModelUuid,
        startDay,
        endDay
      ),
    enabled: !!supabase && !!promptModelUuid,
  });

  return {
    dailyRunLogMetrics,
  };
};

export const useDailyChatLogMetrics = (startDay, endDay) => {
  const { chatModelUuid } = useChatModel();
  const { supabase } = useSupabaseClient();

  const { data: dailyChatLogMetrics } = useQuery({
    queryKey: [
      "dailyChatLogMetrics",
      { chatModelUuid: chatModelUuid, startDay: startDay, endDay: endDay },
    ],
    queryFn: async () =>
      await fetchDailyChatLogMetrics(supabase, chatModelUuid, startDay, endDay),
    enabled: !!supabase && !!chatModelUuid,
  });

  return {
    dailyChatLogMetrics,
  };
};
