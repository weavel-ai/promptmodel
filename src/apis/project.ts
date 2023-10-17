import { SupabaseClient } from "@supabase/supabase-js";
import { railwayWebClient } from "./base";

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
  const res = await railwayWebClient.post(
    "/project",
    {
      data,
    },
    {}
  );

  return res.data;
}

export type Project = Awaited<ReturnType<typeof fetchProjects>>[0];
