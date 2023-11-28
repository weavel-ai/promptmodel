import { SupabaseClient } from "@supabase/supabase-js";

export async function fetchChatModelVersions(
  supabaseClient: SupabaseClient,
  chatModelUuid: string
) {
  const res = await supabaseClient
    .from("chat_model_version")
    .select("uuid, version, from_version, model, is_published, system_prompt")
    .eq("chat_model_uuid", chatModelUuid)
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
      "uuid, version, from_version, model, is_published, is_ab_test, ratio, system_prompt, functions, tags"
    )
    .eq("uuid", uuid)
    .single();
  return res.data;
}

export async function updatePublishedChatModelVersion(
  supabaseClient: SupabaseClient,
  uuid: string,
  previousPublishedVersionUuid: string | null,
  projectVersion: number,
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

  await supabaseClient
    .from("project")
    .update({
      version: projectVersion + 1,
    })
    .eq("uuid", projectUuid);

  return res.data;
}

export async function updateChatModelVersionTags(
  supabaseClient: SupabaseClient,
  versionUuid: string,
  tags: string[]
) {
  const res = await supabaseClient
    .from("chat_model_version")
    .update({ tags: tags })
    .eq("uuid", versionUuid)
    .single();

  return res.data;
}

export type ChatModelVersion = Awaited<
  ReturnType<typeof fetchChatModelVersions>
>[0];
