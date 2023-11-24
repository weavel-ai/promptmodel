import { useSupabaseClient } from "@/apis/base";
import { fetchSampleInputs } from "@/apis/sampleInput";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";

export const EMPTY_INPUTS_LABEL = "No Inputs";

export const useSamples = () => {
  const params = useParams();
  const { createSupabaseClient } = useSupabaseClient();

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

  return {
    sampleInputListData,
    refetchSampleInputListData,
  };
};
