import { useSupabaseClient } from "@/apis/base";
import { fetchOrganization } from "@/apis/organization";
import { fetchProject, fetchProjects } from "@/apis/project";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { useProject } from "./useProject";
import { fetchChatModels, subscribeChatModel } from "@/apis/chatModel";
import { useEffect, useMemo } from "react";

export const useChatModel = () => {
  const params = useParams();
  const { projectUuid } = useProject();
  const { createSupabaseClient } = useSupabaseClient();

  const { data: chatModelListData, refetch: refetchChatModelListData } =
    useQuery({
      queryKey: [
        "modelListData",
        { type: "ChatModel", projectUuid: projectUuid },
      ],
      queryFn: async () =>
        await fetchChatModels(await createSupabaseClient(), projectUuid),
      enabled: projectUuid != undefined && projectUuid != null,
    });

  const chatModelData = useMemo(() => {
    if (chatModelListData == undefined) {
      return undefined;
    }
    return chatModelListData.find(
      (chatModel: { uuid: string }) => chatModel.uuid == params?.chatModelUuid
    );
  }, [chatModelListData, params?.chatModelUuid]);

  // Subscribe to ChatModel changes
  useEffect(() => {
    if (!projectUuid) return;
    createSupabaseClient().then(async (client) => {
      const chatModelStream = await subscribeChatModel(
        client,
        projectUuid,
        () => {
          refetchChatModelListData();
        }
      );
      // Cleanup function that will be called when the component unmounts or when isRealtime becomes false
      return () => {
        if (chatModelStream) {
          chatModelStream.unsubscribe();
          client.removeChannel(chatModelStream);
        }
      };
    });
  }, [projectUuid]);

  return {
    chatModelUuid: params?.chatModelUuid as string,
    chatModelData,
    chatModelListData,
  };
};
