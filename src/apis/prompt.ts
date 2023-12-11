// import { SupabaseClient } from "@supabase/supabase-js";

// export async function fetchPrompts(
//   supabaseClient: SupabaseClient,
//   versionUuid: string
// ) {
//   const res = await supabaseClient
//     .from("prompt")
//     .select("role, step, content")
//     .eq("version_uuid", versionUuid)
//     .order("step");
//   return res.data;
// }
