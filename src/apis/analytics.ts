import { SupabaseClient } from "@supabase/supabase-js";

// View
export async function fetchDailyRunLogMetrics(
  supabaseClient: SupabaseClient,
  promptModelUuid: string,
  start_day: string,
  end_day: string
) {
  const res = await supabaseClient
    .from("daily_run_log_metric")
    .select("day, total_cost, avg_latency, total_token_usage, total_runs")
    .eq("uuid", promptModelUuid)
    .gte("day", start_day)
    .lte("day", end_day)
    .order("day", { ascending: true });
  return res.data;
}
