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
import { fetchChatModelVersions } from "@/apis/devCloud";
import { useChatModelVersionStore } from "@/stores/chatModelVersionStore";

export const useChatModelVersion = () => {
  const params = useParams();
  const { createSupabaseClient } = useSupabaseClient();
  const { devBranchData } = useDevBranch();
  const { chatModelVersionLists, updateChatModelVersionLists } =
    useChatModelVersionStore();

  const {
    data: fetchedChatModelVersionListData,
    refetch: refetchChatModelVersionListData,
  } = useQuery({
    queryKey: [
      "chatModelVersionListData",
      "sync",
      {
        chatModelUuid: params?.chatModelUuid,
        devName: params?.devName,
        projectUuid: params?.projectUuid,
      },
    ],
    queryFn: async () =>
      devBranchData?.cloud
        ? await fetchChatModelVersions({
            supabaseClient: await createSupabaseClient(),
            chatModelUuid: params?.chatModelUuid as string,
            devUuid: devBranchData?.uuid,
          })
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
      Boolean(
        params?.chatModelUuid && params?.devName && params?.projectUuid
      ) && devBranchData != null,
  });

  useEffect(() => {
    updateChatModelVersionLists(
      params?.chatModelUuid as string,
      fetchedChatModelVersionListData
    );
  }, [fetchedChatModelVersionListData]);

  const chatModelVersionListData = useMemo(() => {
    if (!params?.chatModelUuid) return [];
    return chatModelVersionLists[params?.chatModelUuid as string];
  }, [params, chatModelVersionLists]);

  return {
    chatModelUuid: params?.chatModelUuid as string,
    chatModelVersionListData,
    chatModelVersionLists,
    fetchedChatModelVersionListData,
    refetchChatModelVersionListData,
  };
};
