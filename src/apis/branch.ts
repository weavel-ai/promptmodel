import { checkIfValidUUID } from "@/utils";
import { SupabaseClient } from "@supabase/supabase-js";

export async function fetchDevBranches(
  supabaseClient: SupabaseClient,
  projectUuid: string
) {
  const res = await supabaseClient
    .from("dev_branch")
    .select("name, created_at, online, cloud, uuid")
    .eq("project_uuid", projectUuid)
    .order("created_at", { ascending: false });
  return res.data;
}

export async function fetchDevBranch(
  supabaseClient: SupabaseClient,
  projectUuid: string,
  nameOrUuid: string
) {
  let matchObj = {};

  if (checkIfValidUUID(nameOrUuid)) {
    matchObj = { uuid: nameOrUuid, project_uuid: projectUuid };
  } else {
    matchObj = { name: nameOrUuid, project_uuid: projectUuid };
  }

  const res = await supabaseClient
    .from("dev_branch")
    .select("name, created_at, online, cloud, uuid")
    .match(matchObj)
    .single();

  return res.data;
}
