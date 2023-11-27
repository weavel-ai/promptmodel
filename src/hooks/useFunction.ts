import { useSupabaseClient } from "@/apis/base";
import { fetchFunctions, subscribeFunctions } from "@/apis/functionSchema";
import { fetchVersionRunLogs } from "@/apis/runlog";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { useEffect } from "react";

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

  // Subscribe to function changes
  useEffect(() => {
    if (!params?.projectUuid) return;
    createSupabaseClient().then(async (client) => {
      const functionsStream = await subscribeFunctions(
        client,
        params?.projectUuid as string,
        () => {
          refetchFunctionListData();
        }
      );
      // Cleanup function that will be called when the component unmounts or when isRealtime becomes false
      return () => {
        if (functionsStream) {
          functionsStream.unsubscribe();
          client.removeChannel(functionsStream);
        }
      };
    });
  }, [params?.projectUuid]);

  return {
    functionListData,
    refetchFunctionListData,
  };
};
