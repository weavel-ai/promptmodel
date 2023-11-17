import { SupabaseClient } from "@supabase/supabase-js";

export async function fetchChatModels(
  supabaseClient: SupabaseClient,
  projectUuid: string
) {
  const res = await supabaseClient
    .from("chat_model")
    .select("uuid, name, created_at")
    .eq("project_uuid", projectUuid)
    .filter("dev_branch_uuid", "is", null);
  return res.data;
}

export type ChatModel = Awaited<ReturnType<typeof fetchChatModels>>[0];
