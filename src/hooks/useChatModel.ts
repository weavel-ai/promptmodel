import { useSupabaseClient } from "@/apis/supabase";
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
  const { projectUuid, syncToast } = useProject();
  const { supabase } = useSupabaseClient();
  const { chatModelStream, setChatModelStream } = useRealtimeStore();

  const { data: chatModelListData, refetch: refetchChatModelListData } =
    useQuery({
      queryKey: [
        "modelListData",
        { type: "ChatModel", projectUuid: projectUuid },
      ],
      queryFn: async () => await fetchChatModels(supabase, projectUuid),
      enabled: !!supabase && !!projectUuid,
    });

  const chatModelData = useMemo(() => {
    if (chatModelListData == undefined) {
      return undefined;
    }
    return chatModelListData.find(
      (chatModel: { uuid: string }) => chatModel.uuid == params?.chatModelUuid
    );
  }, [chatModelListData, params?.chatModelUuid]);

  async function subscribeToChatModel() {
    if (!projectUuid || chatModelStream || !supabase) return;
    const newStream = await subscribeChatModel(
      supabase,
      projectUuid,
      async () => {
        syncToast.open();
        await refetchChatModelListData();
        syncToast.close();
      }
    );
    setChatModelStream(newStream);

    return () => {
      if (chatModelStream) {
        chatModelStream.unsubscribe();
        supabase.removeChannel(chatModelStream);
      }
    };
  }

  const subscriptionDep = [projectUuid, chatModelStream, supabase];

  return {
    chatModelUuid: params?.chatModelUuid as string,
    chatModelData,
    chatModelListData,
    subscribeToChatModel,
    subscriptionDep,
  };
};
