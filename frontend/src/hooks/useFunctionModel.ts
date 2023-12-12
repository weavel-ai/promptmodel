import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { useProject } from "./useProject";
import { useCallback, useMemo } from "react";
import { useRealtimeStore } from "@/stores/realtimeStore";
import { fetchFunctionModels } from "@/apis/function_models";
import { subscribeTable } from "@/apis/subscribe";

export const useFunctionModel = () => {
  const params = useParams();
  const { projectUuid, syncToast } = useProject();
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

  const subscribeToFunctionModel = useCallback(async () => {
    if (!projectUuid || functionModelStream || !syncToast) return;
    const newStream = await subscribeTable({
      tableName: "function_model",
      project_uuid: projectUuid,
      onMessage: async (event) => {
        syncToast.open();
        await refetchFunctionModelListData();
        syncToast.close();
      },
    });
    setFunctionModelStream(newStream);

    return () => {
      if (functionModelStream) {
        functionModelStream.close();
      }
    };
  }, [
    projectUuid,
    functionModelStream,
    setFunctionModelStream,
    refetchFunctionModelListData,
    syncToast,
  ]);

  return {
    functionModelUuid: params?.functionModelUuid as string,
    functionModelData,
    functionModelListData,
    subscribeToFunctionModel,
  };
};
