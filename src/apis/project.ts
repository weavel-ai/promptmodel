import { SupabaseClient } from "@supabase/supabase-js";

export async function fetchProjects(
  supabaseClient: SupabaseClient,
  organizationId: string
) {
  const res = await supabaseClient
    .from("project")
    .select("uuid, name, description, version")
    .eq("organization_id", organizationId);
  return res.data;
}

export async function fetchProject(
  supabaseClient: SupabaseClient,
  projectUuid: string
) {
  const res = await supabaseClient
    .from("project")
    .select("uuid, name, description, created_at, version, api_key")
    .eq("uuid", projectUuid)
    .single();
  return res.data;
}

export async function createProject(
  supabaseClient: SupabaseClient,
  organizationId: string,
  name: string,
  description?: string
) {
  const data = {
    organization_id: organizationId,
    name: name,
  };
  if (description) {
    data["description"] = description;
  }
  const res = await supabaseClient
    .from("project")
    .insert(data)
    .select("uuid")
    .single();
  return res.data;
}

export type Project = Awaited<ReturnType<typeof fetchProjects>>[0];
