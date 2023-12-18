import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { fetchFunctionModelSampleInputs } from "@/apis/sample_inputs/fetchFunctionModelSampleInputs";

export const useFunctionModelSampleInputs = () => {
  const params = useParams();

  const {
    data: functionModelSampleInputListData,
    refetch: refetchFunctionModelSampleInputListData,
  } = useQuery({
    queryKey: [
      "sampleInputListData",
      {
        projectUuid: params?.projectUuid,
        functionModelUuid: params?.functionModelUuid,
      },
    ],
    queryFn: async () =>
      await fetchFunctionModelSampleInputs({
        function_model_uuid: params?.functionModelUuid as string,
      }),
    enabled: !!params?.projectUuid && !!params?.functionModelUuid,
  });

  return {
    functionModelSampleInputListData,
    refetchFunctionModelSampleInputListData,
  };
};
