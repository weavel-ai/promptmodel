import { useSupabaseClient } from "@/apis/base";
import { fetchOrganization } from "@/apis/organization";
import { fetchProject, fetchProjects } from "@/apis/project";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { useProject } from "./useProject";
import { fetchChatModels, subscribeChatModel } from "@/apis/chatModel";
import { useEffect, useMemo } from "react";
import { useRealtimeStore } from "@/stores/realtimeStore";
import { toast } from "react-toastify";

export const useChatModel = () => {
  const params = useParams();
  const { projectUuid } = useProject();
  const { createSupabaseClient } = useSupabaseClient();
  const { chatModelStream, setChatModelStream } = useRealtimeStore();

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

  function subscribeToChatModel() {
    if (!projectUuid || chatModelStream) return;
    createSupabaseClient().then(async (client) => {
      const newStream = await subscribeChatModel(client, projectUuid, () => {
        toast.loading("Syncing...", {
          toastId: "sync",
          autoClose: 1000,
        });
        refetchChatModelListData();
      });
      setChatModelStream(newStream);
    });

    return () => {
      if (chatModelStream) {
        chatModelStream.unsubscribe();
        createSupabaseClient().then((client) => {
          client.removeChannel(chatModelStream);
        });
      }
    };
  }

  const subscriptionDep = [projectUuid, chatModelStream];

  return {
    chatModelUuid: params?.chatModelUuid as string,
    chatModelData,
    chatModelListData,
    subscribeToChatModel,
    subscriptionDep,
  };
};
