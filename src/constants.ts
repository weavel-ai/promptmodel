export const PRODUCT_NAME = "Promptmodel";

export class Routes {
  // static PAST_EXAMS: string = "/past-exams"
  // static CREATE_ANSWER: string = "/create"
}

export class env {
  static SELF_HOSTED: boolean = process.env.NEXT_PUBLIC_SELF_HOSTED == "true";
  static ENDPOINT_URL: string = process.env.NEXT_PUBLIC_ENDPOINT_URL;
  static SUPABASE_URL: string = process.env.NEXT_PUBLIC_SUPABASE_URL;
  static SUPABASE_KEY: string = process.env.NEXT_PUBLIC_SUPABASE_KEY;
  static AMPLITUDE_API_KEY: string = process.env.NEXT_PUBLIC_AMPLITUDE_API_KEY;

  // Variables below are used for self-hosted instances
  static NEXTAUTH_URL: string = process.env.NEXTAUTH_URL;
  static ORG_NAME: string = process.env.NEXT_PUBLIC_ORG_NAME ?? "admin";
  static ORG_SLUG: string = process.env.NEXT_PUBLIC_ORG_SLUG ?? "admin";

  static AUTH_GOOGLE_CLIENT_ID: string | null =
    process.env.NEXT_PUBLIC_AUTH_GOOGLE_CLIENT_ID || null;
  static AUTH_GOOGLE_CLIENT_SECRET: string | null =
    process.env.NEXT_PUBLIC_AUTH_GOOGLE_CLIENT_SECRET || null;
  static AUTH_GITHUB_CLIENT_ID: string | null =
    process.env.NEXT_PUBLIC_AUTH_GITHUB_CLIENT_ID || null;
  static AUTH_GITHUB_CLIENT_SECRET: string | null =
    process.env.NEXT_PUBLIC_AUTH_GITHUB_CLIENT_SECRET || null;
}
