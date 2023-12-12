import { useSupabaseClient } from "@/apis/supabase";
import { subscribeFunctions } from "@/apis/functionSchema";
import { useRealtimeStore } from "@/stores/realtimeStore";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { useProject } from "./useProject";
import { fetchProjectFunctionSchemas } from "@/apis/function_schemas/fetchProjectFunctionSchemas";
import { subscribeTable } from "@/apis/subscribe";
import { useCallback } from "react";

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

  const subscribeToFunctions = useCallback(async () => {
    if (!params?.projectUuid || !!functionStream) return;
    const newStream: WebSocket = await subscribeTable({
      tableName: "function_schema",
      project_uuid: params?.projectUuid as string,
      onMessage: async (event) => {
        syncToast.open();
        await refetchFunctionListData();
        syncToast.close();
      },
    });
    setFunctionStream(newStream);

    return () => {
      if (functionStream) {
        functionStream.close();
      }
    };
  }, [
    params?.projectUuid,
    functionStream,
    setFunctionStream,
    refetchFunctionListData,
    syncToast,
  ]);

  return {
    functionListData,
    refetchFunctionListData,
    subscribeToFunctions,
  };
};
