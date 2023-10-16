import { useProject } from "./useProject";
import { useSupabaseClient } from "@/apis/base";
import { useQuery } from "@tanstack/react-query";
import { fetchChangelogs } from "@/apis/changelog";

export const useChangeLog = () => {
  const { projectUuid } = useProject();
  const { createSupabaseClient } = useSupabaseClient();

  const { data: changeLogListData } = useQuery({
    queryKey: ["changeLogListData", { projectUuid: projectUuid }],
    queryFn: async () =>
      await fetchChangelogs(await createSupabaseClient(), projectUuid),
    enabled: projectUuid != undefined && projectUuid != null,
  });

  return {
    changeLogListData,
  };
};
