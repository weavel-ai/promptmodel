import { useSupabaseClient } from "@/apis/supabase";
import { subscribeFunctions } from "@/apis/functionSchema";
import { useRealtimeStore } from "@/stores/realtimeStore";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { useProject } from "./useProject";
import { fetchProjectFunctionSchemas } from "@/apis/function_schemas/fetchProjectFunctionSchemas";

export const useFunctions = () => {
  const params = useParams();
  const { supabase } = useSupabaseClient();
  const { functionStream, setFunctionStream } = useRealtimeStore();
  const { syncToast } = useProject();

  const { data: functionListData, refetch: refetchFunctionListData } = useQuery(
    {
      queryKey: ["functionListData", { projectUuid: params?.projectUuid }],
      queryFn: async () =>
        await fetchProjectFunctionSchemas({
          project_uuid: params?.projectUuid as string,
        }),
      enabled: !!params?.projectUuid,
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
