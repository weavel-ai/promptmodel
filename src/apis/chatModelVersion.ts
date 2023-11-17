import { SupabaseClient } from "@supabase/supabase-js";

export async function fetchChatModelVersions(
  supabaseClient: SupabaseClient,
  chatModelUuid: string
) {
  const res = await supabaseClient
    .from("chat_model_version")
    .select("uuid, version, from_uuid, is_published, system_prompt")
    .match({
      chat_model_uuid: chatModelUuid,
      is_deployed: true,
    })
    .order("version", { ascending: true });
  return res.data;
}
export async function fetchChatModelVersion(
  supabaseClient: SupabaseClient,
  uuid: string
) {
  const res = await supabaseClient
    .from("chat_model_version")
    .select(
      "uuid, version, from_uuid, model, is_published, is_ab_test, ratio, system_prompt, functions"
    )
    .eq("uuid", uuid)
    .single();
  return res.data;
}

export async function updatePublishedChatModelVersion(
  supabaseClient: SupabaseClient,
  uuid: string,
  previousPublishedVersionUuid: string | null,
  projectVersion: string,
  projectUuid: string
) {
  if (previousPublishedVersionUuid) {
    await supabaseClient
      .from("chat_model_version")
      .update({ is_published: false })
      .eq("uuid", previousPublishedVersionUuid);
  }
  const res = await supabaseClient
    .from("chat_model_version")
    .update({ is_published: true })
    .eq("uuid", uuid)
    .single();

  // Update project version
  const projectVersionLevel3: number = parseInt(projectVersion.split(".")[2]);
  const newProjectVersion =
    projectVersion.split(".").slice(0, 2).join(".") +
    "." +
    (projectVersionLevel3 + 1).toString();

  await supabaseClient
    .from("project")
    .update({
      version: newProjectVersion,
    })
    .eq("uuid", projectUuid);

  return res.data;
}

export type ChatModelVersion = Awaited<
  ReturnType<typeof fetchChatModelVersions>
>[0];
