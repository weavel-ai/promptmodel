"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/auth/useAuth";
import { useRouter } from "next/navigation";
import { redirectToSignIn } from "@/utils";

export default function Home() {
  const router = useRouter();
  const { isSignedIn } = useAuth();
  const [loadingTime, setLoadingTime] = useState(0);
  const [isLoaded, setisLoaded] = useState(false);

  useEffect(() => {
    // Update loadingtime every 1s. If loading time is more than 3s, stop the interval.
    const interval = setInterval(() => {
      setLoadingTime((prev) => prev + 0.5);
    }, 500);
    if (loadingTime > 1 || isSignedIn) {
      setisLoaded(true);
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [loadingTime, isSignedIn]);

  useEffect(() => {
    if (!isLoaded) return;
    if (isSignedIn) {
      router.push("/org/redirect");
    } else {
      redirectToSignIn();
    }
  }, [isLoaded, isSignedIn, router]);

  return (
    <div className="w-screen h-screen flex flex-col justify-center items-center gap-y-4">
      <div className="loading loading-ring loading-lg" />
      <p>Loading...</p>
    </div>
  );
}
