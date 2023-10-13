import { SupabaseClient } from "@supabase/supabase-js";

export async function fetchModuleVersions(
  supabaseClient: SupabaseClient,
  moduleUuid: string
) {
  const res = await supabaseClient
    .from("llm_module_version")
    .select("uuid, version, from_uuid, is_published")
    .eq("llm_module_uuid", moduleUuid)
    .order("version", { ascending: true });
  return res.data;
}
export async function fetchModuleVersion(
  supabaseClient: SupabaseClient,
  uuid: string
) {
  const res = await supabaseClient
    .from("llm_module_version")
    .select("version, from_uuid, model, is_published, is_ab_test, ratio")
    .eq("uuid", uuid)
    .single();
  return res.data;
}

export async function updatePublishedModuleVersion(
  supabaseClient: SupabaseClient,
  uuid: string,
  previousPublishedVersionUuid: string | null
) {
  if (previousPublishedVersionUuid) {
    await supabaseClient
      .from("llm_module_version")
      .update({ is_published: false })
      .eq("uuid", previousPublishedVersionUuid);
  }
  const res = await supabaseClient
    .from("llm_module_version")
    .update({ is_published: true })
    .eq("uuid", uuid)
    .single();
  return res.data;
}

export type ModuleVersion = Awaited<ReturnType<typeof fetchModuleVersions>>[0];
