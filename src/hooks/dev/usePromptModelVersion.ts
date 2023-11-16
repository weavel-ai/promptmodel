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
  const { promptModelVersionLists, updatePromptModelVersionLists } =
    usePromptModelVersionStore();

  const {
    data: fetchedPromptModelVersionListData,
    refetch: refetchPromptModelVersionListData,
  } = useQuery({
    queryKey: [
      "promptModelVersionListData",
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
    updatePromptModelVersionLists(
      params?.promptModelUuid as string,
      fetchedPromptModelVersionListData
    );
  }, [fetchedPromptModelVersionListData]);

  const promptModelVersionListData = useMemo(() => {
    if (!params?.promptModelUuid) return [];
    return promptModelVersionLists[params?.promptModelUuid as string];
  }, [params, promptModelVersionLists]);

  return {
    promptModelUuid: params?.promptModelUuid as string,
    promptModelVersionListData,
    promptModelVersionLists,
    fetchedPromptModelVersionListData,
    refetchPromptModelVersionListData,
  };
};
