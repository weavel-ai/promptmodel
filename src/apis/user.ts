import { SupabaseClient } from "@supabase/supabase-js";

export async function createUser(
  supabaseClient: SupabaseClient,
  userId: string,
  email: string
) {
  const res = await supabaseClient
    .from("user")
    .insert({ user_id: userId, email: email });
  return res.data;
}

export async function fetchUser(
  supabaseClient: SupabaseClient,
  userId: string
) {
  const res = await supabaseClient
    .from("user")
    .select("*")
    .eq("user_id", userId);
  return res.data;
}

export type CreateUserResponse = Awaited<ReturnType<typeof createUser>>;
export type UserResponse = Awaited<ReturnType<typeof fetchUser>>;
