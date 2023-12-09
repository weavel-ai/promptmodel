import { useSupabaseClient } from "@/apis/supabase";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { useProject } from "./useProject";
import { subscribePromptModel } from "@/apis/promptModel";
import { useMemo } from "react";
import { useRealtimeStore } from "@/stores/realtimeStore";
import { fetchPromptModels } from "@/apis/prompt_models";

export const usePromptModel = () => {
  const params = useParams();
  const { projectUuid, syncToast } = useProject();
  const { supabase } = useSupabaseClient();
  const { promptModelStream, setPromptModelStream } = useRealtimeStore();

  const { data: promptModelListData, refetch: refetchPromptModelListData } =
    useQuery({
      queryKey: [
        "modelListData",
        { type: "PromptModel", projectUuid: projectUuid },
      ],
      queryFn: async () =>
        await fetchPromptModels({ project_uuid: projectUuid }),
      enabled: !!projectUuid,
    });

  const promptModelData = useMemo(() => {
    if (promptModelListData == undefined) {
      return undefined;
    }
    return promptModelListData.find(
      (promptModel: { uuid: string }) =>
        promptModel.uuid == params?.promptModelUuid
    );
  }, [promptModelListData, params?.promptModelUuid]);

  async function subscribeToPromptModel() {
    if (!projectUuid || promptModelStream || !supabase) return;
    const newStream = await subscribePromptModel(
      supabase,
      projectUuid,
      async () => {
        syncToast.open();
        await refetchPromptModelListData();
        syncToast.close();
      }
    );
    setPromptModelStream(newStream);

    return () => {
      if (promptModelStream) {
        promptModelStream.unsubscribe();
        supabase.removeChannel(promptModelStream);
      }
    };
  }

  const subscriptionDep = [projectUuid, promptModelStream, supabase];

  return {
    promptModelUuid: params?.promptModelUuid as string,
    promptModelData,
    promptModelListData,
    subscribeToPromptModel,
    subscriptionDep,
  };
};
