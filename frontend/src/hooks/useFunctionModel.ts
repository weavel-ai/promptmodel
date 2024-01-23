import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { useProject } from "./useProject";
import { useCallback, useMemo, useState } from "react";
import { useRealtimeStore } from "@/stores/realtimeStore";
import { fetchFunctionModels } from "@/apis/function_models";
import { subscribeTable } from "@/apis/subscribe";
import { fetchPublicFunctionModels } from "@/apis/function_models/fetchPublicFunctionModels";

export const ROWS_PER_PAGE = 10;

export const useFunctionModel = () => {
  const params = useParams();
  const { projectUuid, syncToast } = useProject();
  const { functionModelStream, setFunctionModelStream } = useRealtimeStore();
  const [page, setPage] = useState(1);

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

  const {
    data: publicFunctionModelListData,
    refetch: refetchPublicFunctionModelListData,
  } = useQuery({
    queryKey: ["publicFunctionModelListData", { page: page }],
    queryFn: async () =>
      await fetchPublicFunctionModels({
        page: page,
        rows_per_page: ROWS_PER_PAGE,
      }),
  });

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
    publicFunctionModelListData,
    subscribeToFunctionModel,
    page,
    setPage,
  };
};
