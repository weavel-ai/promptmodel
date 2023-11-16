import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import {
  fetchPromptModels as fetchLocalPromptModels,
  updateDevBranchSync,
} from "@/apis/dev";
import { useSupabaseClient } from "@/apis/base";
import { useDevBranch } from "../useDevBranch";
import { fetchChatModels, fetchPromptModels } from "@/apis/devCloud";

export const useChatModel = () => {
  const params = useParams();
  const { createSupabaseClient } = useSupabaseClient();
  const { devBranchData } = useDevBranch();

  const { data: chatModelListData, refetch: refetchChatModelListData } =
    useQuery({
      queryKey: [
        "chatModelListData",
        "sync",
        {
          projectUuid: params?.projectUuid,
          devName: params?.devName,
        },
      ],
      queryFn: async () =>
        devBranchData?.cloud
          ? await fetchChatModels(
              await createSupabaseClient(),
              devBranchData?.uuid as string,
              params?.projectUuid as string
            )
          : null,
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
    chatModelListData,
    refetchChatModelListData,
  };
};
