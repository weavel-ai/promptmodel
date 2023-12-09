import { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";

// View
// export async function fetchPromptModels(
//   supabaseClient: SupabaseClient,
//   projectUuid: string
// ) {
//   const res = await supabaseClient
//     .from("prompt_model")
//     .select("uuid, name, created_at, online")
//     .eq("project_uuid", projectUuid)
//     .order("created_at", { ascending: false });

//   return res.data;
// }

export async function subscribePromptModel(
  supabaseClient: SupabaseClient,
  projectUuid: string,
  onUpdate: () => void
): Promise<RealtimeChannel> {
  const promptModelStream = supabaseClient
    .channel("any")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "prompt_model",
        filter: `project_uuid=eq.${projectUuid}`,
      },
      (payload) => {
        onUpdate();
      }
    )
    .subscribe();

  return promptModelStream;
}

// export async function createPromptModel({
//   supabaseClient,
//   projectUuid,
//   name,
// }: {
//   supabaseClient: SupabaseClient;
//   projectUuid: string;
//   name: string;
// }) {
//   const res = await supabaseClient
//     .from("prompt_model")
//     .insert({
//       project_uuid: projectUuid,
//       name: name,
//     })
//     .select("uuid")
//     .single();

//   return res.data;
// }

// export async function editPromptModelName({
//   supabaseClient,
//   promptModelUuid,
//   name,
// }: {
//   supabaseClient: SupabaseClient;
//   promptModelUuid: string;
//   name: string;
// }) {
//   const res = await supabaseClient
//     .from("prompt_model")
//     .update({ name: name })
//     .eq("uuid", promptModelUuid)
//     .select("uuid")
//     .single();

//   return res.data;
// }

// export async function deletePromptModel({
//   supabaseClient,
//   promptModelUuid,
// }: {
//   supabaseClient: SupabaseClient;
//   promptModelUuid: string;
// }) {
//   const res = await supabaseClient
//     .from("prompt_model")
//     .delete()
//     .eq("uuid", promptModelUuid)
//     .select("uuid")
//     .single();

//   return res.data;
// }

// export type PromptModel = Awaited<ReturnType<typeof fetchPromptModels>>[0];
