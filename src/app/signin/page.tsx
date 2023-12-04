"use client";

import { SignIn, useAuth } from "@clerk/nextjs";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";

export default function Page() {
  const params = useSearchParams();
  const router = useRouter();
  const { isSignedIn } = useAuth();

  useEffect(() => {
    if (isSignedIn) {
      router.push("/signin/redirect");
    }
  }, [isSignedIn, router]);

  return (
    <div className="w-screen h-screen flex justify-center items-center bg-base-100">
      <SignIn
        signUpUrl={`/signup?${params.toString()}`}
        redirectUrl={`/signin/redirect?${params.toString()}`}
      />
    </div>
  );
}
