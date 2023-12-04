"use client";

import { useSupabaseClient } from "@/apis/base";
import { createUser, fetchUser } from "@/apis/user";
import { useAuth, useUser } from "@clerk/nextjs";
import { create } from "domain";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";

export default function Page() {
  const router = useRouter();
  const params = useSearchParams();
  const { supabase } = useSupabaseClient();
  const { userId, isSignedIn } = useAuth();
  const { user } = useUser();

  // Save Clerk user id and email to supabase if user not created yet
  useEffect(() => {
    if (!isSignedIn || !supabase) return;
    fetchUser(supabase, userId)
      .then(async (data) => {
        if (!data || data.length == 0) {
          createUser(supabase, userId, user.primaryEmailAddress.emailAddress);
        }
      })
      .then((data) => {
        router.push("/org/redirect");
      });
  }, [isSignedIn, user, supabase, router, userId]);

  return (
    <div className="w-screen h-screen flex flex-col justify-center items-center gap-y-4 bg-base-100">
      <div className="loading loading-ring loading-lg" />
      <p>Signing in...</p>
    </div>
  );
}
