import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import {
  fetchPromptModels as fetchLocalPromptModels,
  updateDevBranchSync,
} from "@/apis/dev";
import { useSupabaseClient } from "@/apis/base";
import { useDevBranch } from "../useDevBranch";
import { fetchPromptModels } from "@/apis/devCloud";

export const usePromptModel = () => {
  const params = useParams();
  const { createSupabaseClient } = useSupabaseClient();
  const { devBranchData } = useDevBranch();

  const { data: promptModelListData, refetch: refetchPromptModelListData } =
    useQuery({
      queryKey: [
        "promptModelListData",
        "sync",
        {
          projectUuid: params?.projectUuid,
          devName: params?.devName,
        },
      ],
      queryFn: async () =>
        devBranchData?.cloud
          ? await fetchPromptModels(
              await createSupabaseClient(),
              devBranchData?.uuid as string,
              params?.projectUuid as string
            )
          : await fetchLocalPromptModels(
              params?.projectUuid as string,
              params?.devName as string
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
        Boolean(params?.projectUuid && params?.devName) &&
        devBranchData != null,
    });

  return {
    promptModelListData,
    refetchPromptModelListData,
  };
};
