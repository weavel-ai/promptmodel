import { useRealtimeStore } from "@/stores/realtimeStore";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { useProject } from "./useProject";
import { fetchProjectSampleInputs } from "@/apis/sample_inputs";
import { useCallback } from "react";
import { subscribeTable } from "@/apis/subscribe";
import { SampleInput } from "@/types/SampleInput";

export const EMPTY_INPUTS_LABEL = "No Inputs";

export const useSamples = () => {
  const params = useParams();
  const queryClient = useQueryClient();
  const { sampleInputStream, setSampleInputStream } = useRealtimeStore();
  const { syncToast } = useProject();

  const { data: sampleInputListData, refetch: refetchSampleInputListData } =
    useQuery({
      queryKey: ["sampleInputListData", { projectUuid: params?.projectUuid }],
      queryFn: async () =>
        await fetchProjectSampleInputs({
          project_uuid: params?.projectUuid as string,
        }),
      enabled: !!params?.projectUuid,
    });

  const subscribeToSamples = useCallback(async () => {
    if (!params?.projectUuid || !!sampleInputStream) return;

    const newStream = await subscribeTable({
      tableName: "sample_input",
      project_uuid: params?.projectUuid as string,
      onMessage: async (event: MessageEvent) => {
        syncToast.open();
        const data: SampleInput = JSON.parse(event.data);
        if (!!data) {
          const queryKeyObj = {
            projectUuid: params?.projectUuid,
          };
          if (data.function_model_uuid === params?.functionModelUuid) {
            queryKeyObj["functionModelUuid"] = params?.functionModelUuid;
          }
          const previousData = queryClient.getQueryData<SampleInput[]>([
            "sampleInputListData",
            queryKeyObj,
          ]);
          const newData = [...(previousData ?? [])];
          const index = newData.findIndex((d) => d.uuid === data.uuid);
          if (index === -1) {
            newData.unshift(data);
          } else {
            newData[index] = data;
          }
          queryClient.setQueryData<SampleInput[]>(
            ["sampleInputListData", queryKeyObj],
            newData
          );
        }
        syncToast.close();
      },
    });
    setSampleInputStream(newStream);

    return () => {
      if (sampleInputStream) {
        sampleInputStream.close();
      }
    };
  }, [
    params?.projectUuid,
    sampleInputStream,
    setSampleInputStream,
    params?.functionModelUuid,
    // refetchSampleInputListData,
    syncToast,
    queryClient,
  ]);

  return {
    sampleInputListData,
    refetchSampleInputListData,
    subscribeToSamples,
  };
};
