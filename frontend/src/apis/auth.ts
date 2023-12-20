import { env } from "@/constants";
import { getServerSession, type NextAuthOptions } from "next-auth";

// Providers
import { type Provider } from "next-auth/providers";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import GitHubProvider from "next-auth/providers/github";
import { GetServerSidePropsContext } from "next";
import { fetchUser } from "./users";
import { authorizeUser } from "./users";
import { User } from "@/types/User";
import jwt from "jsonwebtoken";

const providers: Provider[] = [
  CredentialsProvider({
    name: "credentials",
    credentials: {
      email: {
        label: "Email",
        type: "email",
        placeholder: "johndoe@example.com",
      },
      password: { label: "Password", type: "password" },
    },
    async authorize(credentials, _req) {
      try {
        const user: User = await authorizeUser({
          email: credentials.email,
          password: credentials.password,
        });

        if (user) {
          // Any user object returned here will be saved in the JSON Web Token
          return Promise.resolve(user);
        } else {
          return Promise.resolve(null);
        }
      } catch (error) {
        console.log(error);
        // Reject this callback with an Error
        throw new Error(error.response?.data);
      }
    },
  }),
];

if (env.AUTH_GOOGLE_CLIENT_ID && env.AUTH_GOOGLE_CLIENT_SECRET)
  providers.push(
    GoogleProvider({
      clientId: env.AUTH_GOOGLE_CLIENT_ID,
      clientSecret: env.AUTH_GOOGLE_CLIENT_SECRET,
      allowDangerousEmailAccountLinking: true,
    })
  );

if (env.AUTH_GITHUB_CLIENT_ID && env.AUTH_GITHUB_CLIENT_SECRET)
  providers.push(
    GitHubProvider({
      clientId: env.AUTH_GITHUB_CLIENT_ID,
      clientSecret: env.AUTH_GITHUB_CLIENT_SECRET,
      allowDangerousEmailAccountLinking: true,
    })
  );

/**
 * Options for NextAuth.js used to configure adapters, providers, callbacks, etc.
 *
 * @see https://next-auth.js.org/configuration/options
 */
export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async session({ session, token }) {
      const user = session.user;
      if (!session?.user_id) {
        if (user?.user_id && user?.first_name && user?.last_name) {
          session.user_id = user?.user_id;
          user.name = user?.first_name + " " + user?.last_name;
        }
        const currentUser: User = await fetchUser(
          { email: token?.email },
          "server"
        );
        if (currentUser) {
          session.user_id = currentUser.user_id;
          user.name = currentUser.first_name + " " + currentUser.last_name;
          user.first_name = currentUser.first_name;
          user.last_name = currentUser.last_name;
        }
      }
      session.user = user;
      // Add encoded jwt
      session.access_token = jwt.sign(session, env.NEXTAUTH_SECRET, {
        algorithm: "HS512",
      });
      return session;
    },
  },
  providers,
  pages: {
    signIn: "/signin",
    error: "/signin",
    newUser: "/signup",
  },
};

/**
 * Wrapper for `getServerSession` so that you don't need to import the `authOptions` in every file.
 *
 * @see https://next-auth.js.org/configuration/nextjs
 */
export const getServerAuthSession = (ctx: {
  req: GetServerSidePropsContext["req"];
  res: GetServerSidePropsContext["res"];
}) => {
  return getServerSession(ctx?.req, ctx?.res, authOptions);
};
