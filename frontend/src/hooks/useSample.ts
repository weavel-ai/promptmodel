import { useRealtimeStore } from "@/stores/realtimeStore";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { useProject } from "./useProject";
import { fetchProjectSampleInputs } from "@/apis/sample_inputs";
import { useCallback } from "react";
import { subscribeTable } from "@/apis/subscribe";

export const EMPTY_INPUTS_LABEL = "No Inputs";

export const useSamples = () => {
  const params = useParams();
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
      onMessage: async (event) => {
        syncToast.open();
        await refetchSampleInputListData();
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
    refetchSampleInputListData,
    syncToast,
  ]);

  return {
    sampleInputListData,
    refetchSampleInputListData,
    subscribeToSamples,
  };
};
