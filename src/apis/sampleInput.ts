import { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";

export async function fetchSampleInputs(
  supabaseClient: SupabaseClient,
  projectUuid: string
) {
  const res = await supabaseClient
    .from("sample_input")
    .select("uuid, name, content, online")
    .eq("project_uuid", projectUuid)
    .order("created_at", { ascending: false });

  return res.data;
}

export async function subscribeSampleInputs(
  supabaseClient: SupabaseClient,
  projectUuid: string,
  onUpdate: () => void
): Promise<RealtimeChannel> {
  const sampleInputStream = supabaseClient
    .channel("any")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "sample_input",
        filter: `project_uuid=eq.${projectUuid}`,
      },
      (payload) => {
        onUpdate();
      }
    )
    .subscribe();

  return sampleInputStream;
}

export async function createSampleInput(
  supabaseClient: SupabaseClient,
  projectUuid: string,
  name: string,
  content: string
) {
  const res = await supabaseClient
    .from("sample_input")
    .insert({
      project_uuid: projectUuid,
      name: name,
      content: JSON.parse(content),
    })
    .single();

  return res.data;
}
