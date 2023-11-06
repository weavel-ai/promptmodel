import { useProject } from "./useProject";
import { useSupabaseClient } from "@/apis/base";
import { useQuery } from "@tanstack/react-query";
import { fetchDevBranch, fetchDevBranches } from "@/apis/branch";
import { useMemo } from "react";
import { useParams } from "next/navigation";

export const useDevBranch = () => {
  const params = useParams();
  const { projectUuid } = useProject();
  const { createSupabaseClient } = useSupabaseClient();

  const nameOrUuid = useMemo(() => params?.devName as string, [params]);

  const { data: devBranchListData } = useQuery({
    queryKey: ["devBranchListData", { projectUuid: projectUuid }],
    queryFn: async () =>
      await fetchDevBranches(await createSupabaseClient(), projectUuid),
    enabled: projectUuid != undefined && projectUuid != null,
  });

  const { data: devBranchData } = useQuery({
    queryKey: [
      "devBranchData",
      { projectUuid: projectUuid, nameOrUuid: nameOrUuid },
    ],
    queryFn: async () =>
      await fetchDevBranch(
        await createSupabaseClient(),
        projectUuid,
        nameOrUuid
      ),
    enabled:
      projectUuid != undefined &&
      projectUuid != null &&
      nameOrUuid != undefined &&
      nameOrUuid != null,
  });

  return {
    devBranchListData,
    devBranchData,
  };
};
