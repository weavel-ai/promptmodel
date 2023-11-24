import { SupabaseClient } from "@supabase/supabase-js";

// View
export async function fetchPromptModels(
  supabaseClient: SupabaseClient,
  projectUuid: string
) {
  const res = await supabaseClient
    .from("prompt_model")
    .select("uuid, name, created_at")
    .eq("project_uuid", projectUuid);
  return res.data;
}

export async function createPromptModel({
  supabaseClient,
  projectUuid,
  name,
}: {
  supabaseClient: SupabaseClient;
  projectUuid: string;
  name: string;
}) {
  const res = await supabaseClient
    .from("prompt_model")
    .insert({
      project_uuid: projectUuid,
      name: name,
    })
    .select("uuid")
    .single();

  return res.data;
}

export type PromptModel = Awaited<ReturnType<typeof fetchPromptModels>>[0];
