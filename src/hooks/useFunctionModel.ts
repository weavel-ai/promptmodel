import { useSupabaseClient } from "@/apis/supabase";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { useProject } from "./useProject";
import { subscribeFunctionModel } from "@/apis/functionModel";
import { useMemo } from "react";
import { useRealtimeStore } from "@/stores/realtimeStore";
import { fetchFunctionModels } from "@/apis/function_models";

export const useFunctionModel = () => {
  const params = useParams();
  const { projectUuid, syncToast } = useProject();
  const { supabase } = useSupabaseClient();
  const { functionModelStream, setFunctionModelStream } = useRealtimeStore();

  const { data: functionModelListData, refetch: refetchFunctionModelListData } =
    useQuery({
      queryKey: [
        "modelListData",
        { type: "FunctionModel", projectUuid: projectUuid },
      ],
      queryFn: async () =>
        await fetchFunctionModels({ project_uuid: projectUuid }),
      enabled: !!projectUuid,
    });

  const functionModelData = useMemo(() => {
    if (functionModelListData == undefined) {
      return undefined;
    }
    return functionModelListData.find(
      (functionModel: { uuid: string }) =>
        functionModel.uuid == params?.functionModelUuid
    );
  }, [functionModelListData, params?.functionModelUuid]);

  async function subscribeToFunctionModel() {
    if (!projectUuid || functionModelStream || !supabase) return;
    const newStream = await subscribeFunctionModel(
      supabase,
      projectUuid,
      async () => {
        syncToast.open();
        await refetchFunctionModelListData();
        syncToast.close();
      }
    );
    setFunctionModelStream(newStream);

    return () => {
      if (functionModelStream) {
        functionModelStream.unsubscribe();
        supabase.removeChannel(functionModelStream);
      }
    };
  }

  const subscriptionDep = [projectUuid, functionModelStream, supabase];

  return {
    functionModelUuid: params?.functionModelUuid as string,
    functionModelData,
    functionModelListData,
    subscribeToFunctionModel,
    subscriptionDep,
  };
};
