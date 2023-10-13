"use client";

import { CreateOrganization, useAuth } from "@clerk/nextjs";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";

export default function Page() {
  const params = useSearchParams();
  const router = useRouter();

  return (
    <div className="w-screen h-screen flex justify-center items-center">
      <CreateOrganization
        appearance={{
          variables: {
            colorBackground: "#222",
            colorText: "#fff",
            colorPrimary: "#8075FF",
            colorTextOnPrimaryBackground: "#fff",
            colorTextSecondary: "#f2f2f2",
            colorInputText: "#fff",
            colorAlphaShade: "#fff",
            colorInputBackground: "#1a1a1a",
          },
        }}
        afterCreateOrganizationUrl={`/org/redirect?${params.toString()}`}
      />
    </div>
  );
}
