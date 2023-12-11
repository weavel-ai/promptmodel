// import { SupabaseClient } from "@supabase/supabase-js";

// export async function createOrganization(
//   supabaseClient: SupabaseClient,
//   organizationId: string,
//   slug: string,
//   userId: string,
//   name: string
// ) {
//   const res = await supabaseClient
//     .from("organization")
//     .insert({ organization_id: organizationId, name: name, slug: slug });
//   await supabaseClient
//     .from("users_organizations")
//     .insert({ organization_id: organizationId, user_id: userId });
//   return res.data;
// }

// export async function updateOrganization(
//   supabaseClient: SupabaseClient,
//   organizationId: string,
//   name: string,
//   slug: string
// ) {
//   const res = await supabaseClient
//     .from("organization")
//     .update({ name: name, slug: slug })
//     .eq("organization_id", organizationId);
//   return res.data;
// }

// export async function fetchOrganization(
//   supabaseClient: SupabaseClient,
//   organizationId: string
// ) {
//   const res = await supabaseClient
//     .from("organization")
//     .select("name, slug")
//     .eq("organization_id", organizationId);
//   return res.data;
// }

// export type OrganizationResponse = Awaited<
//   ReturnType<typeof fetchOrganization>
// >;
