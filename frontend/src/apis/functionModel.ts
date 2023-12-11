import { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";

// View
// export async function fetchFunctionModels(
//   supabaseClient: SupabaseClient,
//   projectUuid: string
// ) {
//   const res = await supabaseClient
//     .from("function_model")
//     .select("uuid, name, created_at, online")
//     .eq("project_uuid", projectUuid)
//     .order("created_at", { ascending: false });

//   return res.data;
// }

export async function subscribeFunctionModel(
  supabaseClient: SupabaseClient,
  projectUuid: string,
  onUpdate: () => void
): Promise<RealtimeChannel> {
  const functionModelStream = supabaseClient
    .channel("any")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "function_model",
        filter: `project_uuid=eq.${projectUuid}`,
      },
      (payload) => {
        onUpdate();
      }
    )
    .subscribe();

  return functionModelStream;
}

// export async function createFunctionModel({
//   supabaseClient,
//   projectUuid,
//   name,
// }: {
//   supabaseClient: SupabaseClient;
//   projectUuid: string;
//   name: string;
// }) {
//   const res = await supabaseClient
//     .from("function_model")
//     .insert({
//       project_uuid: projectUuid,
//       name: name,
//     })
//     .select("uuid")
//     .single();

//   return res.data;
// }

// export async function editFunctionModelName({
//   supabaseClient,
//   functionModelUuid,
//   name,
// }: {
//   supabaseClient: SupabaseClient;
//   functionModelUuid: string;
//   name: string;
// }) {
//   const res = await supabaseClient
//     .from("function_model")
//     .update({ name: name })
//     .eq("uuid", functionModelUuid)
//     .select("uuid")
//     .single();

//   return res.data;
// }

// export async function deleteFunctionModel({
//   supabaseClient,
//   functionModelUuid,
// }: {
//   supabaseClient: SupabaseClient;
//   functionModelUuid: string;
// }) {
//   const res = await supabaseClient
//     .from("function_model")
//     .delete()
//     .eq("uuid", functionModelUuid)
//     .select("uuid")
//     .single();

//   return res.data;
// }

// export type FunctionModel = Awaited<ReturnType<typeof fetchFunctionModels>>[0];
