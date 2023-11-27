import { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";

export async function fetchChatModels(
  supabaseClient: SupabaseClient,
  projectUuid: string
) {
  const res = await supabaseClient
    .from("chat_model")
    .select("uuid, name, created_at, online")
    .eq("project_uuid", projectUuid);
  return res.data;
}

export async function subscribeChatModel(
  supabaseClient: SupabaseClient,
  projectUuid: string,
  onUpdate: () => void
): Promise<RealtimeChannel> {
  const chatModelStream = supabaseClient
    .channel("any")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "chat_model",
        filter: `project_uuid=eq.${projectUuid}`,
      },
      (payload) => {
        onUpdate();
      }
    )
    .subscribe();

  return chatModelStream;
}

export async function createChatModel({
  supabaseClient,
  projectUuid,
  name,
}: {
  supabaseClient: SupabaseClient;
  projectUuid: string;
  name: string;
}) {
  const res = await supabaseClient
    .from("chat_model")
    .insert({
      project_uuid: projectUuid,
      name: name,
    })
    .select("uuid")
    .single();

  return res.data;
}

export type ChatModel = Awaited<ReturnType<typeof fetchChatModels>>[0];
