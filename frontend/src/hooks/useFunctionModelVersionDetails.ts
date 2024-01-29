import { fetchFunctionModelVersion } from "@/apis/function_model_versions";
import { fetchVersionBatchRuns } from "@/apis/function_model_versions/fetchVersionBatchRuns";
import { startFunctionModelVersionBatchRun } from "@/apis/function_model_versions/startBatchRun";
import { fetchPrompts } from "@/apis/prompts";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";

export const useFunctionModelVersionDetails = (versionUuid: string) => {
  const { data: promptListData } = useQuery({
    queryKey: ["promptListData", { versionUuid: versionUuid }],
    queryFn: async () =>
      await fetchPrompts({ function_model_version_uuid: versionUuid }),
    enabled: !!versionUuid,
  });

  const { data: functionModelVersionData } = useQuery({
    queryKey: ["functionModelVersionData", { uuid: versionUuid }],
    queryFn: async () => await fetchFunctionModelVersion({ uuid: versionUuid }),
    enabled: !!versionUuid,
  });

  const versionBatchRunListQuery = useQuery({
    queryKey: ["versionBatchRunList", { versionUuid: versionUuid }],
    queryFn: async () =>
      await fetchVersionBatchRuns({
        uuid: versionUuid,
      }),
    onSuccess: () => {},
    enabled: !!versionUuid,
    refetchInterval: (data) =>
      data?.some((item) => item.status === "running") ? 3000 : false,
  });

  const startBatchRunMutation = useMutation({
    mutationKey: ["startBatchRun"],
    mutationFn: startFunctionModelVersionBatchRun,
    onSuccess: () => versionBatchRunListQuery.refetch(),
    onError: (error: any) => {
      toast.error(error.response.data.detail);
    },
  });

  return {
    promptListData,
    functionModelVersionData,
    versionBatchRunListQuery,
    startBatchRunMutation,
  };
};
