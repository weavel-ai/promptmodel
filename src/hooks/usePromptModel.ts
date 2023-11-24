import { useSupabaseClient } from "@/apis/base";
import { fetchOrganization } from "@/apis/organization";
import { fetchProject, fetchProjects } from "@/apis/project";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { useProject } from "./useProject";
import { fetchPromptModels } from "@/apis/promptModel";

export const usePromptModel = () => {
  const params = useParams();
  const { projectUuid } = useProject();
  const { createSupabaseClient } = useSupabaseClient();

  const { data: promptModelListData } = useQuery({
    queryKey: [
      "modelListData",
      { type: "PromptModel", projectUuid: projectUuid },
    ],
    queryFn: async () =>
      await fetchPromptModels(await createSupabaseClient(), projectUuid),
    enabled: projectUuid != undefined && projectUuid != null,
  });

  return {
    promptModelUuid: params?.promptModelUuid as string,
    promptModelListData,
  };
};
