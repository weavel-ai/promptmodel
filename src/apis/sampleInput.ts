import { SupabaseClient } from "@supabase/supabase-js";

export async function fetchSampleInputs(
  supabaseClient: SupabaseClient,
  projectUuid: string
) {
  const res = await supabaseClient
    .from("sample_input")
    .select("uuid, name, content, online")
    .eq("project_uuid", projectUuid)
    .order("created_at", { ascending: false });

  return res.data;
}
