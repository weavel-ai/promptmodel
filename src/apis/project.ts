import {
  RealtimeChannel,
  RealtimePostgresChangesPayload,
  SupabaseClient,
} from "@supabase/supabase-js";
import { railwayWebClient } from "./base";
import { url } from "inspector";

export async function fetchProjects(
  supabaseClient: SupabaseClient,
  organizationId: string
) {
  const res = await supabaseClient
    .from("project")
    .select("uuid, name, description, version, online")
    .eq("organization_id", organizationId);
  return res.data;
}

export async function fetchProject(
  supabaseClient: SupabaseClient,
  projectUuid: string
) {
  const res = await supabaseClient
    .from("project")
    .select("uuid, name, description, created_at, version, api_key, online")
    .eq("uuid", projectUuid)
    .single();
  return res.data;
}

export async function subscribeProject(
  supabaseClient: SupabaseClient,
  organizationId: string,
  onUpdate: () => Promise<void>
): Promise<RealtimeChannel> {
  const projectStream = supabaseClient
    .channel("any")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "project",
        filter: `organization_id=eq.${organizationId}`,
      },
      async (payload: any) => {
        if (payload.new.cli_access_key != null && payload.new.online == false) {
          return;
        }
        await onUpdate();
      }
    )
    .subscribe();

  return projectStream;
}

export async function createProject(
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
  const res = await railwayWebClient.post("/project", data, {});

  return res.data;
}

export type Project = Awaited<ReturnType<typeof fetchProjects>>[0];
