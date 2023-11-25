import { SupabaseClient } from "@supabase/supabase-js";

export async function fetchFunctions(
  supabaseClient: SupabaseClient,
  projectUuid: string
) {
  const res = await supabaseClient
    .from("function_schema")
    .select("uuid, name, description, online")
    .eq("project_uuid", projectUuid)
    .order("created_at", { ascending: false });

  return res.data;
}

export async function fetchFunctionSchema(
  supabaseClient: SupabaseClient,
  uuid: string
) {
  const res = await supabaseClient
    .from("function_schema")
    .select(
      "uuid, created_at, name, description, parameter, mock_response, online"
    )
    .eq("uuid", uuid)
    .single();

  return res.data;
}
