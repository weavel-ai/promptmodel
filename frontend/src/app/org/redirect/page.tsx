"use client";

import { logEvent } from "@/services/amplitude";
import { useAuth } from "@/hooks/auth/useAuth";
import { useOrganization } from "@/hooks/auth/useOrganization";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ENV } from "@/constants";
import { createOrganization, fetchOrganization } from "@/apis/organizations";
import { AxiosError } from "axios";

export default function Page() {
  const router = useRouter();
  const { organization } = useOrganization();
  const { userId } = useAuth();
  const [loadingTime, setLoadingTime] = useState(0);
  const [isLoaded, setisLoaded] = useState(false);

  // Save Clerk organization id and name to supabase if org not created yet
  useEffect(() => {
    // Update loadingtime every 1s. If loading time is more than 3s, stop the interval.
    const interval = setInterval(() => {
      setLoadingTime((prev) => prev + 1);
    }, 1000);
    if (loadingTime > 3 || organization?.id != null) {
      setisLoaded(true);
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [loadingTime, organization?.id]);

  useEffect(() => {
    // if (env.SELF_HOSTED && organization?.slug != null) {
    //   router.push(`/org/${organization.slug}`);
    //   return;
    // }
    if (!isLoaded) return;
    if (organization?.id != null && organization?.slug != null) {
      fetchOrganization({ organization_id: organization.id })
        .catch(async (err: AxiosError) => {
          console.log(err);
          if (err.response.status == 404) {
            await createOrganization({
              organization_id: organization.id,
              slug: organization?.slug,
              user_id: userId,
              name: organization.name,
            });

            logEvent("org_created", { user_id: userId });

            return Promise.resolve();
          }
          // Propagate other errors
          return Promise.reject(err);
        })
        .then(() => {
          router.push(`/org/${organization.slug}`);
        });
    } else {
      // If clerk org is not created yet, redirect to org creation page
      router.push("/org/new");
    }
  }, [
    organization?.id,
    organization?.slug,
    organization?.name,
    userId,
    isLoaded,
    router,
  ]);

  return (
    <div className="w-screen h-screen flex flex-col justify-center items-center gap-y-4">
      <div className="loading loading-ring loading-lg" />
      <p>Loading workspace...</p>
    </div>
  );
}
