import { useSupabaseClient } from "@/apis/base";
import { fetchOrganization } from "@/apis/organization";
import { fetchProject, fetchProjects } from "@/apis/project";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { useProject } from "./useProject";
import { fetchPromptModels, subscribePromptModel } from "@/apis/promptModel";
import { useEffect, useMemo } from "react";
import { toast } from "react-toastify";
import { useRealtimeStore } from "@/stores/realtimeStore";

export const usePromptModel = () => {
  const params = useParams();
  const { projectUuid } = useProject();
  const { createSupabaseClient } = useSupabaseClient();
  const { promptModelStream, setPromptModelStream } = useRealtimeStore();

  const { data: promptModelListData, refetch: refetchPromptModelListData } =
    useQuery({
      queryKey: [
        "modelListData",
        { type: "PromptModel", projectUuid: projectUuid },
      ],
      queryFn: async () =>
        await fetchPromptModels(await createSupabaseClient(), projectUuid),
      enabled: projectUuid != undefined && projectUuid != null,
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

  // Subscribe to PromptModel changes
  useEffect(() => {
    if (!projectUuid) return;
    if (!promptModelStream) {
      createSupabaseClient().then(async (client) => {
        const newStream = await subscribePromptModel(
          client,
          projectUuid,
          () => {
            toast("Syncing...", {
              toastId: "sync",
            });
            refetchPromptModelListData();
          }
        );
        setPromptModelStream(newStream);
      });
    }
    // Cleanup function that will be called when the component unmounts or when isRealtime becomes false
    return () => {
      if (promptModelStream) {
        promptModelStream.unsubscribe();
        createSupabaseClient().then((client) => {
          client.removeChannel(promptModelStream);
        });
      }
    };
  }, [projectUuid, promptModelStream]);

  return {
    promptModelUuid: params?.promptModelUuid as string,
    promptModelData,
    promptModelListData,
  };
};
