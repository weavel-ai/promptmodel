"use client";

import { useSupabaseClient } from "@/apis/base";
import { fetchDevBranch, subscribeDevBranchStatus } from "@/apis/dev";
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

const MAX_REFETCH_COUNT = 20;

export default function Page() {
  const params = useParams();
  const router = useRouter();
  const pathname = usePathname();
  const { createSupabaseClient } = useSupabaseClient();
  const [status, setStatus] = useState<BranchStatus>(BranchStatus.LOADING);
  const [refetchCount, setRefetchCount] = useState<number>(0);

  const { data } = useQuery({
    queryKey: ["devBranch", params?.devName as string],
    queryFn: async () =>
      await fetchDevBranch(
        await createSupabaseClient(),
        params?.projectUuid as string,
        params?.devName as string
      ),
    onSettled: (data) => {
      setRefetchCount(refetchCount + 1);
    },
    onSuccess: (data) => {
      if (data && data?.length > 0) {
        if (data[0].online || data[0].cloud) {
          setStatus(BranchStatus.ONLINE);
          router.push(pathname + "/modules");
        } else {
          setStatus(BranchStatus.OFFLINE);
        }
      } else {
        setStatus(BranchStatus.NOT_FOUND);
      }
    },
    refetchInterval:
      status == BranchStatus.OFFLINE || refetchCount < MAX_REFETCH_COUNT
        ? 1000
        : false,
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
