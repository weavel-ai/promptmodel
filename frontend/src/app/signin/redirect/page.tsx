"use client";

import { useSupabaseClient } from "@/apis/supabase";
import { fetchUser } from "@/apis/users";
import { useAuth } from "@/hooks/auth/useAuth";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { env } from "@/constants";
/**
 * @todo Change this to use backend server
 */
import { createUser } from "@/apis/user";

export default function Page() {
  const router = useRouter();
  const { supabase } = useSupabaseClient();
  const { isSignedIn, user, userId } = useAuth();

  // Save Clerk user id and email to supabase if user not created yet
  useEffect(() => {
    if (env.SELF_HOSTED) {
      if (!isSignedIn) return;
    } else {
      if (!isSignedIn || !supabase) return;
      fetchUser({ email: user.email })
        .then(async (data) => {
          if (!data) {
            createUser(supabase, userId, user.email);
          }
        })
        .then((data) => {
          router.push("/org/redirect");
        });
    }
  }, [isSignedIn, user, supabase, router, userId]);

  return (
    <div className="w-screen h-screen flex flex-col justify-center items-center gap-y-4 bg-base-100">
      <div className="loading loading-ring loading-lg" />
      <p>Signing in...</p>
    </div>
  );
}
