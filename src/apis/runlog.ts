import { SupabaseClient } from "@supabase/supabase-js";

export async function fetchVersionRunLogs(
  supabaseClient: SupabaseClient,
  versionUuid: string
) {
  const res = await supabaseClient
    .from("run_log")
    .select(
      "created_at, inputs, raw_output, parsed_outputs, function_call, latency, cost, token_usage, run_from_deployment"
    )
    .eq("version_uuid", versionUuid)
    .filter("dev_branch_uuid", "is", null)
    .order("created_at", { ascending: false });
  return res.data;
}

export async function fetchDeplRunLogs(
  supabaseClient: SupabaseClient,
  projectUuid: string
) {
  const res = await supabaseClient
    .from("deployment_run_log_view")
    .select(
      "project_uuid, prompt_model_name, prompt_model_uuid, prompt_model_version_uuid, prompt_model_version, created_at, inputs, raw_output, parsed_outputs, function_call, latency, cost, token_usage, run_from_deployment"
    )
    .eq("project_uuid", projectUuid)
    .order("created_at", { ascending: false });

  return res.data;
}

export type RunLog = Awaited<ReturnType<typeof fetchVersionRunLogs>>[0];
