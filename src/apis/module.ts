import { SupabaseClient } from "@supabase/supabase-js";

// View
export async function fetchModules(
  supabaseClient: SupabaseClient,
  projectUuid: string
) {
  const res = await supabaseClient
    .from("llm_module")
    .select("uuid, name, created_at")
    .eq("project_uuid", projectUuid)
    .filter("dev_branch_uuid", "is", null);
  return res.data;
}

export type Module = Awaited<ReturnType<typeof fetchModules>>[0];
