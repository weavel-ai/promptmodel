import { SupabaseClient } from "@supabase/supabase-js";

export async function fetchChangelogs(
  supabaseClient: SupabaseClient,
  projectUuid: string
) {
  const res = await supabaseClient
    .from("project_changelog")
    .select("logs, created_at")
    .eq("project_uuid", projectUuid)
    .order("created_at", { ascending: false });
  return res.data;
}
