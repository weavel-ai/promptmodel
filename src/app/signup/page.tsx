"use client";

import { SignUp } from "@clerk/nextjs";
import { useSearchParams } from "next/navigation";
import { useEffect } from "react";

export default function Page() {
  const params = useSearchParams();

  return (
    <div className="w-screen h-screen flex justify-center items-center bg-base-100">
      <SignUp
        signInUrl={`/signin?${params.toString()}`}
        redirectUrl={`/signin/redirect?${params.toString()}`}
      />
    </div>
  );
}
