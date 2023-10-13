import { SupabaseClient } from "@supabase/supabase-js";

export async function fetchPrompts(
  supabaseClient: SupabaseClient,
  moduleVersionUuid: string
) {
  const res = await supabaseClient
    .from("prompt")
    .select("role, step, content")
    .eq("version_uuid", moduleVersionUuid)
    .order("step");
  return res.data;
}
