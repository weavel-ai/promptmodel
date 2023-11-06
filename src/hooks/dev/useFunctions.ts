import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { fetchFunctions, updateDevBranchSync } from "@/apis/dev";
import { useSupabaseClient } from "@/apis/base";
import { useDevBranch } from "../useDevBranch";

export const useFunctions = () => {
  const params = useParams();
  const { createSupabaseClient } = useSupabaseClient();
  const { devBranchData } = useDevBranch();

  const { data: functionListData, refetch: refetchFunctionListData } = useQuery(
    {
      queryKey: [
        "functionListData",
        "sync",
        {
          projectUuid: params?.projectUuid,
          devName: params?.devName,
        },
      ],
      queryFn: async () =>
        await fetchFunctions(
          params?.projectUuid as string,
          params?.devName as string
        ),
      onSettled: async (data) => {
        await updateDevBranchSync(
          await createSupabaseClient(),
          params?.projectUuid as string,
          params?.devName as string,
          true
        );
      },
      enabled:
        Boolean(params?.projectUuid && params?.devName) &&
        devBranchData?.cloud == false,
    }
  );

  return {
    functionListData,
    refetchFunctionListData,
  };
};
