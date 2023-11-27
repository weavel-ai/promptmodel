import { useSupabaseClient } from "@/apis/base";
import { fetchOrganization } from "@/apis/organization";
import { fetchProject, fetchProjects } from "@/apis/project";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { useProject } from "./useProject";
import { fetchPromptModels, subscribePromptModel } from "@/apis/promptModel";
import { useEffect, useMemo } from "react";

export const usePromptModel = () => {
  const params = useParams();
  const { projectUuid } = useProject();
  const { createSupabaseClient } = useSupabaseClient();

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
    if (!params?.promptModelUuid) return;
    createSupabaseClient().then(async (client) => {
      const promptModelStream = await subscribePromptModel(
        client,
        projectUuid,
        () => {
          refetchPromptModelListData();
        }
      );
      // Cleanup function that will be called when the component unmounts or when isRealtime becomes false
      return () => {
        if (promptModelStream) {
          promptModelStream.unsubscribe();
          client.removeChannel(promptModelStream);
        }
      };
    });
  }, [params?.promptModelUuid]);

  return {
    promptModelUuid: params?.promptModelUuid as string,
    promptModelData,
    promptModelListData,
  };
};
