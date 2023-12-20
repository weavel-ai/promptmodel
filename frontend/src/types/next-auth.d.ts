import NextAuth, { DefaultSession, DefaultUser } from "next-auth";
import { DefaultJWT } from "next-auth/jwt";

declare module "next-auth" {
  /**
   * Returned by `useSession`, `getSession` and received as a prop on the `SessionProvider` React Context
   */
  interface Session {
    user_id: string;
    user: User & DefaultSession["user"];
    access_token: string;
  }

  interface JWT extends DefaultJWT {
    user_id: string;
  }

  interface User extends DefaultUser {
    user_id: string;
    name: string;
    first_name: string;
    last_name: string;
  }
}
