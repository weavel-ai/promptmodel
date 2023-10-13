import { SupabaseClient } from "@supabase/supabase-js";

export async function fetchChangelogs(
  supabaseClient: SupabaseClient,
  projectUuid: string
) {
  const res = await supabaseClient
    .from("project_changelog")
    .select("changelog, previous_version, created_at")
    .eq("project_uuid", projectUuid);
  return res.data;
}
