import { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";

export async function fetchChatLogSessions(
  supabaseClient: SupabaseClient,
  versionUuid: string,
  devUuid?: string
) {
  const res = await supabaseClient
    .from("chat_log_session")
    .select("uuid, created_at, run_from_deployment")
    .eq("version_uuid", versionUuid)
    .or(`dev_branch_uuid.eq.${devUuid},dev_branch_uuid.is.null`)
    .order("created_at", { ascending: false });

  return res.data;
}

export async function fetchSessionChatLogs(
  supabaseClient: SupabaseClient,
  sessionUuid: string
) {
  const res = await supabaseClient
    .from("chat_log")
    .select("created_at, role, content, tool_calls, latency, cost, token_usage")
    .eq("session_uuid", sessionUuid)
    .order("created_at", { ascending: true });
  return res.data;
}

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

export type ChatLog = Awaited<ReturnType<typeof fetchSessionChatLogs>>[0];
