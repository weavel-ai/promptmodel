import { fetchProjectChangelogs } from "@/apis/changelogs";
import { useProject } from "./useProject";
import { useQuery } from "@tanstack/react-query";

export const useChangeLog = () => {
  const { projectUuid } = useProject();

  const { data: changeLogListData } = useQuery({
    queryKey: ["changeLogListData", { projectUuid: projectUuid }],
    queryFn: async () =>
      await fetchProjectChangelogs({ project_uuid: projectUuid }),
    enabled: !!projectUuid,
  });

  return {
    changeLogListData,
  };
};
