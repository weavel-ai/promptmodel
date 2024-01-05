import { useMutation, useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { fetchFunctionModelDatasets } from "@/apis/sample_inputs/fetchFunctionModelDatasets";
import { createDataset } from "@/apis/sample_inputs/createDataset";

export const useFunctionModelDatasets = () => {
  const params = useParams();

  const {
    data: functionModelDatasetListData,
    refetch: refetchFunctionModelDatasetListData,
  } = useQuery({
    queryKey: [
      "datasetListData",
      {
        projectUuid: params?.projectUuid,
        functionModelUuid: params?.functionModelUuid,
      },
    ],
    queryFn: async () =>
      await fetchFunctionModelDatasets({
        function_model_uuid: params?.functionModelUuid as string,
      }),
    enabled: !!params?.projectUuid && !!params?.functionModelUuid,
  });

  const createDatasetMutation = useMutation({
    mutationKey: ["createDataset"],
    mutationFn: createDataset,
    onSuccess: () => refetchFunctionModelDatasetListData(),
  });

  function findDataset(uuid: string) {
    return functionModelDatasetListData?.find(
      (dataset) => dataset.uuid === uuid
    );
  }

  return {
    functionModelDatasetListData,
    refetchFunctionModelDatasetListData,
    createDatasetMutation,
    findDataset,
  };
};
