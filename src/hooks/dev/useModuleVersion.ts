import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import {
  fetchModuleVersions as fetchLocalModuleVersions,
  updateDevBranchSync,
} from "@/apis/dev";
import { useSupabaseClient } from "@/apis/base";
import { useEffect, useMemo, useState } from "react";
import { useModuleVersionStore } from "@/stores/moduleVersionStore";
import { useDevBranch } from "../useDevBranch";
import { fetchModuleVersions } from "@/apis/devCloud";

export const useModuleVersion = () => {
  const params = useParams();
  const { createSupabaseClient } = useSupabaseClient();
  const { devBranchData } = useDevBranch();
  const { moduleVersionLists, updateModuleVersionLists } =
    useModuleVersionStore();

  const { data: fetchedVersionListData, refetch: refetchVersionListData } =
    useQuery({
      queryKey: [
        "versionListData",
        "sync",
        {
          moduleUuid: params?.moduleUuid,
          devName: params?.devName,
          projectUuid: params?.projectUuid,
        },
      ],
      queryFn: async () =>
        devBranchData?.cloud
          ? await fetchModuleVersions(
              await createSupabaseClient(),
              devBranchData?.uuid,
              params?.moduleUuid as string
            )
          : await fetchLocalModuleVersions(
              params?.projectUuid as string,
              params?.devName as string,
              params?.moduleUuid as string
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
        Boolean(params?.moduleUuid && params?.devName && params?.projectUuid) &&
        devBranchData != null,
    });

  useEffect(() => {
    updateModuleVersionLists(
      params?.moduleUuid as string,
      fetchedVersionListData
    );
  }, [fetchedVersionListData]);

  const versionListData = useMemo(() => {
    if (!params?.moduleUuid) return [];
    return moduleVersionLists[params?.moduleUuid as string];
  }, [params, moduleVersionLists]);

  return {
    moduleUuid: params?.moduleUuid as string,
    versionListData,
    moduleVersionLists,
    fetchedVersionListData,
    refetchVersionListData,
  };
};
