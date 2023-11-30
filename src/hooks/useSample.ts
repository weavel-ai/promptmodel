import { useSupabaseClient } from "@/apis/base";
import { fetchSampleInputs, subscribeSampleInputs } from "@/apis/sampleInput";
import { useRealtimeStore } from "@/stores/realtimeStore";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { useEffect } from "react";
import { toast } from "react-toastify";

export const EMPTY_INPUTS_LABEL = "No Inputs";

export const useSamples = () => {
  const params = useParams();
  const { createSupabaseClient } = useSupabaseClient();
  const { sampleInputStream, setSampleInputStream } = useRealtimeStore();

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

  // Subscribe to sample input changes
  useEffect(() => {
    if (!params?.projectUuid) return;
    if (!sampleInputStream) {
      createSupabaseClient().then(async (client) => {
        const newStream = await subscribeSampleInputs(
          client,
          params?.projectUuid as string,
          () => {
            toast("Syncing samples...");
            refetchSampleInputListData();
          }
        );
        setSampleInputStream(newStream);
      });
    }
    // Cleanup function that will be called when the component unmounts or when isRealtime becomes false
    return () => {
      if (sampleInputStream) {
        sampleInputStream.unsubscribe();
        createSupabaseClient().then((client) => {
          client.removeChannel(sampleInputStream);
        });
      }
    };
  }, [params?.projectUuid, sampleInputStream]);

  return {
    sampleInputListData,
    refetchSampleInputListData,
  };
};
