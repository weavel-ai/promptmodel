import { fetchRunLogs, fetchSamples as fetchLocalSamples } from "@/apis/dev";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { useDevBranch } from "../useDevBranch";
import { fetchSampleInputs } from "@/apis/devCloud";
import { useSupabaseClient } from "@/apis/base";

export const EMPTY_INPUTS_LABEL = "No inputs";

export const useSamples = () => {
  const params = useParams();
  const { createSupabaseClient } = useSupabaseClient();
  const { devBranchData } = useDevBranch();

  const { data: sampleList, refetch: refetchSampleList } = useQuery({
    queryKey: ["sampleList", "dev", { uuid: params?.projectUuid }],
    queryFn: async () => {
      const samples: Record<string, any>[] = devBranchData?.cloud
        ? await fetchSampleInputs(
            await createSupabaseClient(),
            params?.projectUuid as string
          )
        : await fetchLocalSamples(
            params?.projectUuid as string,
            params?.devName as string
          );
      samples.unshift({ name: EMPTY_INPUTS_LABEL });
      return samples;
    },
    enabled:
      params?.projectUuid != undefined &&
      params?.projectUuid != null &&
      devBranchData != null,
  });

  return {
    sampleList,
    refetchSampleList,
  };
};
