import { SupabaseClient } from "@supabase/supabase-js";

export async function fetchRunLogs(
  supabaseClient: SupabaseClient,
  versionUuid: string
) {
  const res = await supabaseClient
    .from("run_log")
    .select(
      "created_at, inputs, raw_output, parsed_outputs, function_call, latency, cost, token_usage"
    )
    .eq("version_uuid", versionUuid);
  return res.data;
}

export type RunLog = Awaited<ReturnType<typeof fetchRunLogs>>[0];
