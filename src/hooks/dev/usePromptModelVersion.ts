import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import {
  fetchPromptModelVersions as fetchLocalPromptModelVersions,
  updateDevBranchSync,
} from "@/apis/dev";
import { useSupabaseClient } from "@/apis/base";
import { useEffect, useMemo, useState } from "react";
import { usePromptModelVersionStore } from "@/stores/promptModelVersionStore";
import { useDevBranch } from "../useDevBranch";
import { fetchPromptModelVersions } from "@/apis/devCloud";

export const usePromptModelVersion = () => {
  const params = useParams();
  const { createSupabaseClient } = useSupabaseClient();
  const { devBranchData } = useDevBranch();
  const { versionLists, updateVersionLists } = usePromptModelVersionStore();

  const { data: fetchedVersionListData, refetch: refetchVersionListData } =
    useQuery({
      queryKey: [
        "versionListData",
        "sync",
        {
          promptModelUuid: params?.promptModelUuid,
          devName: params?.devName,
          projectUuid: params?.projectUuid,
        },
      ],
      queryFn: async () =>
        devBranchData?.cloud
          ? await fetchPromptModelVersions(
              await createSupabaseClient(),
              devBranchData?.uuid,
              params?.promptModelUuid as string
            )
          : await fetchLocalPromptModelVersions(
              params?.projectUuid as string,
              params?.devName as string,
              params?.promptModelUuid as string
            ),
      onSettled: async (data) => {
        if (devBranchData?.cloud) return;
        await updateDevBranchSync(
          await createSupabaseClient(),
          params?.projectUuid as string,
          params?.devName as string,
          true
        );
      },
      enabled:
        Boolean(
          params?.promptModelUuid && params?.devName && params?.projectUuid
        ) && devBranchData != null,
    });

  useEffect(() => {
    updateVersionLists(
      params?.promptModelUuid as string,
      fetchedVersionListData
    );
  }, [fetchedVersionListData]);

  const versionListData = useMemo(() => {
    if (!params?.promptModelUuid) return [];
    return versionLists[params?.promptModelUuid as string];
  }, [params, versionLists]);

  return {
    promptModelUuid: params?.promptModelUuid as string,
    versionListData,
    versionLists,
    fetchedVersionListData,
    refetchVersionListData,
  };
};
