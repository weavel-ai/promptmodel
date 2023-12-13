"use client";

import { fetchUser } from "@/apis/users";
import { useAuth } from "@/hooks/auth/useAuth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { env } from "@/constants";
import { createClerkUser } from "@/apis/users/createClerkUser";
import { AxiosError } from "axios";

export default function Page() {
  const router = useRouter();
  const { isSignedIn, user, userId } = useAuth();

  // Save Clerk user id and email to supabase if user not created yet
  useEffect(() => {
    if (env.SELF_HOSTED) {
      if (!isSignedIn) return;
    } else {
      if (!isSignedIn) return;
      fetchUser({ email: user.email })
        .catch(async (err: AxiosError) => {
          if (err.response.status == 404) {
            await createClerkUser({ user_id: userId, email: user.email });
            return Promise.resolve();
          }
          return Promise.reject(err);
        })
        .then((data) => {
          router.push("/org/redirect");
        });
    }
  }, [isSignedIn, user, router, userId]);

  return (
    <div className="w-screen h-screen flex flex-col justify-center items-center gap-y-4 bg-base-100">
      <div className="loading loading-ring loading-lg" />
      <p>Signing in...</p>
    </div>
  );
}
