import { useSupabaseClient } from "@/apis/base";
import { fetchOrganization } from "@/apis/organization";
import { fetchProject, fetchProjects } from "@/apis/project";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { useProject } from "./useProject";
import { fetchModules } from "@/apis/module";

export const useModule = () => {
  const params = useParams();
  const { projectUuid } = useProject();
  const { createSupabaseClient } = useSupabaseClient();

  const { data: moduleListData } = useQuery({
    queryKey: ["moduleListData", { projectUuid: projectUuid }],
    queryFn: async () =>
      await fetchModules(await createSupabaseClient(), projectUuid),
    enabled: projectUuid != undefined && projectUuid != null,
  });

  return {
    moduleUuid: params?.moduleUuid as string,
    moduleListData,
  };
};
