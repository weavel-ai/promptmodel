import { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";

// export async function fetchChatLogSessions({
//   supabaseClient,
//   versionUuid,
// }: {
//   supabaseClient: SupabaseClient;
//   versionUuid: string;
// }) {
//   const res = await supabaseClient
//     .from("chat_log_session")
//     .select("uuid, created_at, run_from_deployment")
//     .eq("version_uuid", versionUuid)
//     .order("created_at", { ascending: false });

//   return res.data;
// }

// export async function fetchSessionChatLogs(
//   supabaseClient: SupabaseClient,
//   sessionUuid: string
// ) {
//   const res = await supabaseClient
//     .from("chat_log")
//     .select("created_at, role, content, tool_calls, latency, cost, token_usage")
//     .eq("session_uuid", sessionUuid)
//     .order("created_at", { ascending: true });
//   return res.data;
// }

// // View
// export async function fetchChatLogs(
//   supabaseClient: SupabaseClient,
//   projectUuid: string,
//   page: number,
//   rowsPerPage: number
// ) {
//   const res = await supabaseClient
//     .from("chat_log_view")
//     .select(
//       "project_uuid, chat_model_name, chat_model_uuid, chat_model_version_uuid, chat_model_version, created_at, user_input, assistant_output, tool_calls, latency, cost, token_usage, run_from_deployment"
//     )
//     .eq("project_uuid", projectUuid)
//     .order("created_at", { ascending: false })
//     .range((page - 1) * rowsPerPage, page * rowsPerPage - 1);

//   return res.data;
// }

// // View
// export async function fetchChatLogsCount(
//   supabaseClient: SupabaseClient,
//   projectUuid: string
// ) {
//   const res = await supabaseClient
//     .from("chat_logs_count")
//     .select("chat_logs_count")
//     .eq("project_uuid", projectUuid)
//     .single();

//   return res.data;
// }

export async function subscribeChatLogs(
  supabaseClient: SupabaseClient,
  projectUuid: string,
  onUpdate: () => void
): Promise<RealtimeChannel> {
  const chatModelList = await supabaseClient
    .from("chat_model")
    .select("uuid")
    .eq("project_uuid", projectUuid);

  const chatModelVersionList = await supabaseClient
    .from("chat_model_version")
    .select("uuid")
    .in(
      "chat_model_uuid",
      chatModelList.data.map((item) => item.uuid)
    );

  const chatLogsStream = supabaseClient
    .channel("any")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "chat_log",
        filter: `version_uuid=in.(${chatModelVersionList.data
          .map((item) => `${item.uuid}`)
          .join(",")})`,
      },
      (payload) => {
        onUpdate();
      }
    )
    .subscribe();

  return chatLogsStream;
}

// export type ChatLog = Awaited<ReturnType<typeof fetchSessionChatLogs>>[0];
