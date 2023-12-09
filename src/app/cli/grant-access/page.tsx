"use client";

import { useSupabaseClient } from "@/apis/supabase";
import { upsertCliAccess } from "@/apis/cliAccess";
import { useAuth } from "@/hooks/auth/useAuth";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import Confetti from "react-confetti";

export default function Page() {
  const searchParams = useSearchParams();
  const { supabase } = useSupabaseClient();
  const router = useRouter();
  const { userId, isSignedIn, isLoaded } = useAuth();
  const [loading, setLoading] = useState(false);
  const [granted, setGranted] = useState(false);
  const [loadingTime, setLoadingTime] = useState(0);

  async function handleClickGrant() {
    if (loading) return;
    setLoading(true);
    if (!isSignedIn) {
      toast.error("Please sign in first to grant access.");
      router.push("/signin");
      setLoading(false);
    }
    const token = searchParams.get("token");
    if (!token) {
      toast.error("Token is missing.");
      router.push("/org/redirect");
      setLoading(false);
    }
    const res = await upsertCliAccess(supabase, userId, token);
    if (!res) {
      toast.error("Failed to grant access.");
      setLoading(false);
    }
    setGranted(true);
    setLoading(false);
  }

  useEffect(() => {
    // Update loadingtime every 1s. If loading time is more than 3s, stop the interval.
    const interval = setInterval(() => {
      setLoadingTime((prev) => prev + 1);
    }, 1000);
    if (loadingTime > 3) {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [loadingTime]);

  if (!isSignedIn && loadingTime < 3) {
    return (
      <div className="w-full h-full flex justify-center items-center">
        <div className="loading loading-lg" />
      </div>
    );
  }

  if (!isSignedIn && loadingTime >= 3) {
    return (
      <div className="w-full h-full flex justify-center items-center">
        <p>Please sign in first to grant access.</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex justify-center items-center">
      {!granted ? (
        <div className="bg-gradient-to-br from-base-200/50 to-base-200 rounded-box p-6 flex flex-col gap-y-2 justify-start items-start">
          <p className="text-base-content font-semibold text-2xl">CLI Login</p>
          <p className="text-base-content">
            PromptModel CLI you are running is requesting access to your
            account.
          </p>
          <button
            className="btn btn-primary self-end text-base-content mt-4 normal-case"
            onClick={handleClickGrant}
          >
            {loading ? (
              <div className="loading loading-spinner loading-sm" />
            ) : (
              <p>Grant Access</p>
            )}
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center gap-y-2">
          <Confetti
            recycle={false}
            width={window?.innerWidth}
            height={window?.innerHeight}
          />
          <p className="text-xl">CLI Access Granted! 🎉</p>
          <p className="text-base">You can close this window now.</p>
        </div>
      )}
    </div>
  );
}
