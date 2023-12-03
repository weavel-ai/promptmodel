"use client";

import { useSupabaseClient } from "@/apis/base";
import { createOrganization, fetchOrganization } from "@/apis/organization";
import { logEvent } from "@/services/amplitude";
import { useAuth, useOrganization } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function Page() {
  const router = useRouter();
  const { createSupabaseClient } = useSupabaseClient();
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
    if (!isLoaded) return;
    if (organization?.id != null && organization?.slug != null) {
      createSupabaseClient().then(async (supabase) => {
        await fetchOrganization(supabase, organization.id)
          .then(async (data) => {
            if (data?.length == 0) {
              await createOrganization(
                supabase,
                organization.id,
                organization?.slug,
                userId,
                organization.name
              );

              logEvent("org_created", { user_id: userId });
            }
          })
          .then(() => {
            router.push(`/org/${organization.slug}`);
          });
      });
    } else {
      // If clerk org is not created yet, redirect to org creation page
      router.push("/org/new");
    }
  }, [organization?.id, organization?.slug, userId, isLoaded]);

  return (
    <div className="w-screen h-screen flex flex-col justify-center items-center gap-y-4">
      <div className="loading loading-ring loading-lg" />
      <p>Loading workspace...</p>
    </div>
  );
}
