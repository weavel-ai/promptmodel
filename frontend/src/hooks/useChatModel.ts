import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { useProject } from "./useProject";
import { useCallback, useEffect, useMemo } from "react";
import { useRealtimeStore } from "@/stores/realtimeStore";
import { toast } from "react-toastify";
import { fetchChatModels } from "@/apis/chat_models";
import { subscribeTable } from "@/apis/subscribe";

export const useChatModel = () => {
  const params = useParams();
  const { projectUuid, syncToast } = useProject();
  const { chatModelStream, setChatModelStream } = useRealtimeStore();

  const { data: chatModelListData, refetch: refetchChatModelListData } =
    useQuery({
      queryKey: [
        "modelListData",
        { type: "ChatModel", projectUuid: projectUuid },
      ],
      queryFn: async () => await fetchChatModels({ project_uuid: projectUuid }),
      enabled: !!projectUuid,
    });

  const chatModelData = useMemo(() => {
    if (chatModelListData == undefined) {
      return undefined;
    }
    return chatModelListData.find(
      (chatModel: { uuid: string }) => chatModel.uuid == params?.chatModelUuid
    );
  }, [chatModelListData, params?.chatModelUuid]);

  const subscribeToChatModel = useCallback(async () => {
    if (!projectUuid || chatModelStream) return;

    const newStream: WebSocket = await subscribeTable({
      tableName: "chat_model",
      project_uuid: projectUuid,
      onMessage: async (event) => {
        syncToast.open();
        await refetchChatModelListData();
        syncToast.close();
      },
    });
    setChatModelStream(newStream);

    return () => {
      if (chatModelStream) {
        chatModelStream.close();
      }
    };
  }, [
    projectUuid,
    chatModelStream,
    setChatModelStream,
    refetchChatModelListData,
    syncToast,
  ]);

  return {
    chatModelUuid: params?.chatModelUuid as string,
    chatModelData,
    chatModelListData,
    subscribeToChatModel,
  };
};
