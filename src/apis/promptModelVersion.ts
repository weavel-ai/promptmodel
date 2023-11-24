import { SupabaseClient } from "@supabase/supabase-js";

export async function fetchPromptModelVersions(
  supabaseClient: SupabaseClient,
  promptModelUuid: string
) {
  const res = await supabaseClient
    .from("prompt_model_version")
    .select("uuid, version, from_version, is_published")
    .match({
      prompt_model_uuid: promptModelUuid,
    })
    .order("version", { ascending: true });
  return res.data;
}
export async function fetchPromptModelVersion(
  supabaseClient: SupabaseClient,
  uuid: string
) {
  const res = await supabaseClient
    .from("prompt_model_version")
    .select(
      "uuid, version, from_version, model, is_published, is_ab_test, ratio, parsing_type, output_keys, functions"
    )
    .eq("uuid", uuid)
    .single();
  return res.data;
}

export async function updatePublishedPromptModelVersion(
  supabaseClient: SupabaseClient,
  uuid: string,
  previousPublishedVersionUuid: string | null,
  projectVersion: number,
  projectUuid: string
) {
  if (previousPublishedVersionUuid) {
    await supabaseClient
      .from("prompt_model_version")
      .update({ is_published: false })
      .eq("uuid", previousPublishedVersionUuid);
  }
  const res = await supabaseClient
    .from("prompt_model_version")
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

export type PromptModelVersion = Awaited<
  ReturnType<typeof fetchPromptModelVersions>
>[0];
