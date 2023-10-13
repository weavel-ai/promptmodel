import { SupabaseClient } from "@supabase/supabase-js";

export async function fetchDevBranches(
  supabaseClient: SupabaseClient,
  projectUuid: string
) {
  const res = await supabaseClient
    .from("dev_branch")
    .select("name, created_at")
    .eq("project_uuid", projectUuid);
  return res.data;
}
