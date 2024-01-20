import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { fetchFunctionModelDatasets } from "@/apis/sample_inputs/fetchFunctionModelDatasets";
import { createDataset } from "@/apis/sample_inputs/createDataset";
import { updateDataset } from "@/apis/sample_inputs/updateDataset";
import { Dataset, DatasetWithEvalMetric } from "@/types/SampleInput";
import { deleteDataset } from "@/apis/sample_inputs/deleteDataset";

export const useFunctionModelDatasets = () => {
  const params = useParams();
  const queryClient = useQueryClient();

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

  const updateDatasetMutation = useMutation({
    mutationKey: ["updateDataset"],
    mutationFn: updateDataset,
    onSuccess: (data: Dataset) => {
      queryClient.setQueryData(
        [
          "datasetListData",
          {
            projectUuid: params?.projectUuid,
            functionModelUuid: params?.functionModelUuid,
          },
        ],
        (oldData: DatasetWithEvalMetric[]) => {
          return oldData.map((dataset) => {
            if (dataset.dataset_uuid === data.uuid) {
              dataset.dataset_name = data.name;
              dataset.dataset_uuid = data.uuid;
            }
            return dataset;
          });
        }
      );
    },
  });

  const deleteDatasetMutation = useMutation({
    mutationKey: ["deleteDataset"],
    mutationFn: deleteDataset,
    onSuccess: () => refetchFunctionModelDatasetListData(),
  });

  function findDataset(uuid: string) {
    return functionModelDatasetListData?.find(
      (dataset) => dataset.dataset_uuid === uuid
    );
  }

  return {
    functionModelDatasetListData,
    refetchFunctionModelDatasetListData,
    createDatasetMutation,
    updateDatasetMutation,
    deleteDatasetMutation,
    findDataset,
  };
};
