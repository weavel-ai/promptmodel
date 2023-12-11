// import { SupabaseClient } from "@supabase/supabase-js";

// export async function fetchFunctionModelVersions(
//   supabaseClient: SupabaseClient,
//   functionModelUuid: string
// ) {
//   const res = await supabaseClient
//     .from("function_model_version")
//     .select("uuid, created_at, version, from_version, is_published, tags, memo")
//     .match({
//       function_model_uuid: functionModelUuid,
//     })
//     .order("version", { ascending: true });
//   return res.data;
// }
// export async function fetchFunctionModelVersion(
//   supabaseClient: SupabaseClient,
//   uuid: string
// ) {
//   const res = await supabaseClient
//     .from("function_model_version")
//     .select(
//       "uuid, version, from_version, model, is_published, is_ab_test, ratio, parsing_type, output_keys, functions, tags, memo"
//     )
//     .eq("uuid", uuid)
//     .single();
//   return res.data;
// }

// export async function updatePublishedFunctionModelVersion(
//   supabaseClient: SupabaseClient,
//   uuid: string,
//   previousPublishedVersionUuid: string | null,
//   projectVersion: number,
//   projectUuid: string
// ) {
//   if (previousPublishedVersionUuid) {
//     await supabaseClient
//       .from("function_model_version")
//       .update({ is_published: false })
//       .eq("uuid", previousPublishedVersionUuid);
//   }
//   const res = await supabaseClient
//     .from("function_model_version")
//     .update({ is_published: true })
//     .eq("uuid", uuid)
//     .single();

//   await supabaseClient
//     .from("project")
//     .update({
//       version: projectVersion + 1,
//     })
//     .eq("uuid", projectUuid);

//   return res.data;
// }

// export async function updateFunctionModelVersionTags(
//   supabaseClient: SupabaseClient,
//   versionUuid: string,
//   tags: string[]
// ) {
//   const res = await supabaseClient
//     .from("function_model_version")
//     .update({ tags: tags })
//     .eq("uuid", versionUuid)
//     .single();

//   return res.data;
// }

// export async function updateFunctionModelVersionMemo(
//   supabaseClient: SupabaseClient,
//   versionUuid: string,
//   memo: string
// ) {
//   const res = await supabaseClient
//     .from("function_model_version")
//     .update({ memo: memo })
//     .eq("uuid", versionUuid)
//     .single();

//   return res.data;
// }

// export type FunctionModelVersion = Awaited<
//   ReturnType<typeof fetchFunctionModelVersions>
// >[0];
