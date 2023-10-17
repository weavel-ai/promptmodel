import { fetchRunLogs, fetchSamples } from "@/apis/dev";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";

export const EMPTY_INPUTS_LABEL = "No inputs";

export const useSamples = () => {
  const params = useParams();

  const { data: sampleList, refetch: refetchSampleList } = useQuery({
    queryKey: ["sampleList", "dev", { uuid: params?.projectUuid }],
    queryFn: async () => {
      const samples: Record<string, any>[] = await fetchSamples(
        params?.projectUuid as string,
        params?.devName as string
      );
      samples.unshift({ name: EMPTY_INPUTS_LABEL });
      return samples;
    },
    enabled: params?.projectUuid != undefined && params?.projectUuid != null,
  });

  return {
    sampleList,
    refetchSampleList,
  };
};
