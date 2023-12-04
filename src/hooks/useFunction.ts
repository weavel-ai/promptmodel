import { useSupabaseClient } from "@/apis/base";
import { fetchFunctions, subscribeFunctions } from "@/apis/functionSchema";
import { fetchVersionRunLogs } from "@/apis/runlog";
import { useRealtimeStore } from "@/stores/realtimeStore";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { useProject } from "./useProject";

export const useFunctions = () => {
  const params = useParams();
  const { supabase } = useSupabaseClient();
  const { functionStream, setFunctionStream } = useRealtimeStore();
  const { syncToast } = useProject();

  const { data: functionListData, refetch: refetchFunctionListData } = useQuery(
    {
      queryKey: ["functionListData", { projectUuid: params?.projectUuid }],
      queryFn: async () =>
        await fetchFunctions(supabase, params?.projectUuid as string),
      enabled: !!supabase && !!params?.projectUuid,
    }
  );

  async function subscribeToFunctions() {
    if (!params?.projectUuid || functionStream || !supabase) return;
    const newStream = await subscribeFunctions(
      supabase,
      params?.projectUuid as string,
      async () => {
        syncToast.open();
        await refetchFunctionListData();
        syncToast.close();
      }
    );
    setFunctionStream(newStream);

    return () => {
      if (functionStream) {
        functionStream.unsubscribe();
        supabase.removeChannel(functionStream);
      }
    };
  }

  const subscriptionDep = [params?.projectUuid, functionStream, supabase];

  return {
    functionListData,
    refetchFunctionListData,
    subscribeToFunctions,
    subscriptionDep,
  };
};
