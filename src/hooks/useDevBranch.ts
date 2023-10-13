import { useProject } from "./useProject";
import { useSupabaseClient } from "@/apis/base";
import { useQuery } from "@tanstack/react-query";
import { fetchDevBranches } from "@/apis/branch";

export const useDevBranch = () => {
  const { projectUuid } = useProject();
  const { createSupabaseClient } = useSupabaseClient();

  const { data: devBranchListData } = useQuery({
    queryKey: ["devBranchListData", { projectUuid: projectUuid }],
    queryFn: async () =>
      await fetchDevBranches(await createSupabaseClient(), projectUuid),
    enabled: projectUuid != undefined && projectUuid != null,
  });

  return {
    devBranchListData,
  };
};
