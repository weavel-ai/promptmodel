// import { SupabaseClient } from "@supabase/supabase-js";

// export async function upsertCliAccess(
//   supabaseClient: SupabaseClient,
//   userId: string,
//   apiKey: string
// ) {
//   const res = await supabaseClient
//     .from("cli_access")
//     .upsert({ user_id: userId, api_key: apiKey })
//     .select("*")
//     .single();
//   return res.data;
// }
