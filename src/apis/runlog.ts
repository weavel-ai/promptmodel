import { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";

// export async function fetchVersionRunLogs(
//   supabaseClient: SupabaseClient,
//   versionUuid: string
// ) {
//   const res = await supabaseClient
//     .from("run_log")
//     .select(
//       "created_at, inputs, raw_output, parsed_outputs, function_call, latency, cost, token_usage, run_from_deployment"
//     )
//     .eq("version_uuid", versionUuid)
//     .order("created_at", { ascending: false });
//   return res.data;
// }

// export async function fetchRunLogs(
//   supabaseClient: SupabaseClient,
//   projectUuid: string,
//   page: number,
//   rowsPerPage: number
// ) {
//   const res = await supabaseClient
//     .from("deployment_run_log_view")
//     .select(
//       "project_uuid, prompt_model_name, prompt_model_uuid, prompt_model_version_uuid, prompt_model_version, created_at, inputs, raw_output, parsed_outputs, function_call, latency, cost, token_usage, run_from_deployment"
//     )
//     .eq("project_uuid", projectUuid)
//     .order("created_at", { ascending: false })
//     .range((page - 1) * rowsPerPage, page * rowsPerPage - 1);

//   return res.data;
// }

// // View
// export async function fetchRunLogsCount(
//   supabaseClient: SupabaseClient,
//   projectUuid: string
// ) {
//   const res = await supabaseClient
//     .from("run_logs_count")
//     .select("run_logs_count")
//     .eq("project_uuid", projectUuid)
//     .single();

//   return res.data;
// }

export async function subscribeRunLogs(
  supabaseClient: SupabaseClient,
  projectUuid: string,
  onUpdate: () => void
): Promise<RealtimeChannel> {
  const promptModelList = await supabaseClient
    .from("prompt_model")
    .select("uuid")
    .eq("project_uuid", projectUuid);

  const promptModelVersionList = await supabaseClient
    .from("prompt_model_version")
    .select("uuid")
    .in(
      "prompt_model_uuid",
      promptModelList.data.map((item) => item.uuid)
    );

  const runLogsStream = supabaseClient
    .channel("any")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "run_log",
        filter: `version_uuid=in.(${promptModelVersionList.data
          .map((item) => `${item.uuid}`)
          .join(",")})`,
      },
      (payload) => {
        onUpdate();
      }
    )
    .subscribe();

  return runLogsStream;
}

// export type RunLog = Awaited<ReturnType<typeof fetchVersionRunLogs>>[0];
