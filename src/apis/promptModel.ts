import { SupabaseClient } from "@supabase/supabase-js";

// View
export async function fetchPromptModels(
  supabaseClient: SupabaseClient,
  projectUuid: string
) {
  const res = await supabaseClient
    .from("prompt_model")
    .select("uuid, name, created_at")
    .eq("project_uuid", projectUuid)
    .filter("dev_branch_uuid", "is", null);
  return res.data;
}

export type PromptModel = Awaited<ReturnType<typeof fetchPromptModels>>[0];
