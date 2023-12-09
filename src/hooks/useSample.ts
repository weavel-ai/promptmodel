import { useSupabaseClient } from "@/apis/supabase";
import { subscribeSampleInputs } from "@/apis/sampleInput";
import { useRealtimeStore } from "@/stores/realtimeStore";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { useProject } from "./useProject";
import { fetchProjectSampleInputs } from "@/apis/sample_inputs";

export const EMPTY_INPUTS_LABEL = "No Inputs";

export const useSamples = () => {
  const params = useParams();
  const { supabase } = useSupabaseClient();
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

  async function subscribeToSamples() {
    if (!params?.projectUuid || sampleInputStream || !supabase) return;
    const newStream = await subscribeSampleInputs(
      supabase,
      params?.projectUuid as string,
      async () => {
        syncToast.open();
        await refetchSampleInputListData();
        syncToast.close();
      }
    );
    setSampleInputStream(newStream);

    return () => {
      if (sampleInputStream) {
        sampleInputStream.unsubscribe();
        supabase.removeChannel(sampleInputStream);
      }
    };
  }

  const subscriptionDep = [params?.projectUuid, sampleInputStream, supabase];

  return {
    sampleInputListData,
    refetchSampleInputListData,
    subscribeToSamples,
    subscriptionDep,
  };
};
