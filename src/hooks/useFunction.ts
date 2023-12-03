import { useSupabaseClient } from "@/apis/base";
import { fetchFunctions, subscribeFunctions } from "@/apis/functionSchema";
import { fetchVersionRunLogs } from "@/apis/runlog";
import { useRealtimeStore } from "@/stores/realtimeStore";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { useProject } from "./useProject";

export const useFunctions = () => {
  const params = useParams();
  const { createSupabaseClient } = useSupabaseClient();
  const { functionStream, setFunctionStream } = useRealtimeStore();
  const { syncToast } = useProject();

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

  function subscribeToFunctions() {
    if (!params?.projectUuid || functionStream) return;
    createSupabaseClient().then(async (client) => {
      const newStream = await subscribeFunctions(
        client,
        params?.projectUuid as string,
        async () => {
          syncToast.open();
          await refetchFunctionListData();
          syncToast.close();
        }
      );
      setFunctionStream(newStream);
    });

    return () => {
      if (functionStream) {
        functionStream.unsubscribe();
        createSupabaseClient().then((client) => {
          client.removeChannel(functionStream);
        });
      }
    };
  }

  const subscriptionDep = [params?.projectUuid, functionStream];

  return {
    functionListData,
    refetchFunctionListData,
    subscribeToFunctions,
    subscriptionDep,
  };
};
