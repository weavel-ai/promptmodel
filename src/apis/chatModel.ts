import { SupabaseClient } from "@supabase/supabase-js";

export async function fetchChatModels(
  supabaseClient: SupabaseClient,
  projectUuid: string
) {
  const res = await supabaseClient
    .from("chat_model")
    .select("uuid, name, created_at")
    .eq("project_uuid", projectUuid);
  return res.data;
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
