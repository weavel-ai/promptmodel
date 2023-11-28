import { SupabaseClient } from "@supabase/supabase-js";

export async function fetchTags(
  supabaseClient: SupabaseClient,
  projectUuid: string
) {
  const res = await supabaseClient
    .from("tag")
    .select("name, color")
    .eq("project_uuid", projectUuid)
    .order("name", { ascending: true });

  return res.data;
}

export async function createTag(
  supabaseClient: SupabaseClient,
  projectUuid: string,
  name: string,
  color: string
) {
  const res = await supabaseClient
    .from("tag")
    .insert({
      project_uuid: projectUuid,
      name: name,
      color: color,
    })
    .single();

  return res.data;
}
