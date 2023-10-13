"use client";

import { useSupabaseClient } from "@/apis/base";
import { fetchDevBranch } from "@/apis/dev";
import { Warning } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { useParams, usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

enum BranchStatus {
  ONLINE,
  OFFLINE,
  NOT_FOUND,
  LOADING,
}

export default function Page() {
  const params = useParams();
  const router = useRouter();
  const pathname = usePathname();
  const { createSupabaseClient } = useSupabaseClient();
  const [status, setStatus] = useState<BranchStatus>(BranchStatus.LOADING);

  const { data } = useQuery({
    queryKey: ["devBranch", params?.devName as string],
    queryFn: async () =>
      await fetchDevBranch(
        await createSupabaseClient(),
        params?.projectUuid as string,
        params?.devName as string
      ),
    onSuccess: (data) => {
      if (data && data?.length > 0) {
        if (data[0].online) {
          setStatus(BranchStatus.ONLINE);
          router.push(pathname + "/modules");
        } else {
          setStatus(BranchStatus.OFFLINE);
        }
      } else {
        setStatus(BranchStatus.NOT_FOUND);
      }
    },
  });

  if (status == BranchStatus.NOT_FOUND) {
    return (
      <div className="w-full h-full flex flex-col gap-y-8 justify-center items-center">
        <Warning size={48} className="text-base-content" />
        <p className="text-lg">
          Development branch
          <strong>&nbsp;{params?.devName}&nbsp;</strong>
          wasn&apos;t found.
        </p>
      </div>
    );
  }

  if (status == BranchStatus.OFFLINE) {
    return (
      <div className="w-full h-full flex flex-col gap-y-8 justify-center items-center">
        <Warning size={48} className="text-base-content" />
        <p className="text-lg">
          Development branch
          <strong>&nbsp;{params?.devName}&nbsp;</strong>
          is offline.
        </p>
      </div>
    );
  }

  return <div className="loading loading-ring" />;
}
