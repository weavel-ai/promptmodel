"use client";

import { useAuthorization } from "@/hooks/auth/useAuthorization";
import { redirect } from "next/navigation";
import { useEffect } from "react";

export function ProjectAuthProvider({ children }) {
  const { isLoading, isAuthorizedForProject } = useAuthorization();

  useEffect(() => {
    if (!isLoading && !isAuthorizedForProject) {
      redirect("/");
    }
  }, [isAuthorizedForProject, isLoading]);

  if (isLoading)
    return (
      <div className="flex justify-center items-center w-full h-full">
        <div className="loading loading-lg loading-ring" />
      </div>
    );

  return <>{children}</>;
}
