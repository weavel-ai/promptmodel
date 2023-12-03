import { useSupabaseClient } from "@/apis/base";
import { fetchSampleInputs, subscribeSampleInputs } from "@/apis/sampleInput";
import { useRealtimeStore } from "@/stores/realtimeStore";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { useProject } from "./useProject";

export const EMPTY_INPUTS_LABEL = "No Inputs";

export const useSamples = () => {
  const params = useParams();
  const { createSupabaseClient } = useSupabaseClient();
  const { sampleInputStream, setSampleInputStream } = useRealtimeStore();
  const { syncToast } = useProject();

  const { data: sampleInputListData, refetch: refetchSampleInputListData } =
    useQuery({
      queryKey: ["sampleInputListData", { projectUuid: params?.projectUuid }],
      queryFn: async () =>
        await fetchSampleInputs(
          await createSupabaseClient(),
          params?.projectUuid as string
        ),
      enabled: params?.projectUuid != undefined && params?.projectUuid != null,
    });

  function subscribeToSamples() {
    if (!params?.projectUuid || sampleInputStream) return;
    createSupabaseClient().then(async (client) => {
      const newStream = await subscribeSampleInputs(
        client,
        params?.projectUuid as string,
        async () => {
          syncToast.open();
          await refetchSampleInputListData();
          syncToast.close();
        }
      );
      setSampleInputStream(newStream);
    });

    return () => {
      if (sampleInputStream) {
        sampleInputStream.unsubscribe();
        createSupabaseClient().then((client) => {
          client.removeChannel(sampleInputStream);
        });
      }
    };
  }

  const subscriptionDep = [params?.projectUuid, sampleInputStream];

  return {
    sampleInputListData,
    refetchSampleInputListData,
    subscribeToSamples,
    subscriptionDep,
  };
};
