import { useSupabaseClient } from "@/apis/base";
import { fetchFunctions } from "@/apis/functionSchema";
import { fetchVersionRunLogs } from "@/apis/runlog";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";

export const useFunctions = () => {
  const params = useParams();
  const { createSupabaseClient } = useSupabaseClient();

  const { data: functionListData, refetch: refetchFunctionListData } = useQuery(
    {
      queryKey: ["functionListData", { projectUuid: params?.projectUuid }],
      queryFn: async () =>
        await fetchFunctions(
          await createSupabaseClient(),
          params?.projectUuid as string
        ),
      enabled: params?.projectUuid != undefined && params?.projectUuid != null,
    }
  );

  return {
    functionListData,
    refetchFunctionListData,
  };
};
