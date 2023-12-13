import { env } from "@/constants";
import { useAuth as useClerkAuth, useUser } from "@clerk/nextjs";
import { useSession } from "next-auth/react";

interface SessionUser {
  email?: string;
  name?: string;
  firstName?: string;
  lastName?: string;
}

interface NextAuthReturn {
  isLoaded: boolean;
  isSignedIn: boolean;
  userId: string;
  orgId: string;
  orgRole: any;
  orgSlug: string | null;
  // Clerk return types
  signOut?: any;
  getToken?: any;
  // NextAuth return types
  user?: SessionUser;
}

type CustomClerkAuthReturn = ReturnType<typeof useClerkAuth> & {
  user: SessionUser;
};

function useCustomClerkAuth() {
  const { user } = useUser();
  const clerkAuth = useClerkAuth();

  return {
    ...clerkAuth,
    user: {
      email: user?.primaryEmailAddress.emailAddress,
      name: user?.fullName,
      firstName: user?.firstName,
      lastName: user?.lastName,
    },
  };
}

function useNextAuth(): NextAuthReturn {
  const { data: session, status } = useSession();

  function getToken() {
    return Promise.resolve("");
  }

  return {
    isLoaded: status !== "loading",
    isSignedIn: status === "authenticated",
    userId: session?.userId,
    orgId: "self",
    orgRole: "admin",
    orgSlug: "admin",
    getToken: getToken,
    user: {
      email: session?.user?.email,
      name: session?.user?.name,
      firstName: session?.user?.first_name,
      lastName: session?.user?.last_name,
    },
  };
}

export const useAuth = env.SELF_HOSTED ? useNextAuth : useCustomClerkAuth;
// export function useAuth() {
//   return env.SELF_HOSTED ? useNextAuth() : useCustomClerkAuth();
// }
