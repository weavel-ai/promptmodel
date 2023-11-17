import { useSupabaseClient } from "@/apis/base";
import { fetchOrganization } from "@/apis/organization";
import { fetchProject, fetchProjects } from "@/apis/project";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { useProject } from "./useProject";
import { fetchChatModels } from "@/apis/chatModel";

export const useChatModel = () => {
  const params = useParams();
  const { projectUuid } = useProject();
  const { createSupabaseClient } = useSupabaseClient();

  const { data: chatModelListData } = useQuery({
    queryKey: ["chatModelListData", { projectUuid: projectUuid }],
    queryFn: async () =>
      await fetchChatModels(await createSupabaseClient(), projectUuid),
    enabled: projectUuid != undefined && projectUuid != null,
  });

  return {
    promptModelUuid: params?.promptModelUuid as string,
    chatModelListData,
  };
};
