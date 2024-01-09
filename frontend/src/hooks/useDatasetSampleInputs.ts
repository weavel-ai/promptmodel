import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { fetchDatasetSampleInputs } from "@/apis/sample_inputs/fetchDatasetSampleInputs";
import { postDatasetSampleInputs } from "@/apis/sample_inputs/postDatasetSampleInputs";
import {
  PostDatasetSampleInputsRequest,
  SampleInput,
} from "@/types/SampleInput";
import { useState } from "react";
import { fetchDatasetSampleInputsCount } from "@/apis/sample_inputs/fetchDatasetSampleInputsCount";
import { updateSampleInput } from "@/apis/sample_inputs/updateSampleInput";

export const ROWS_PER_PAGE = 30;

export const useDatasetSampleInputs = () => {
  const params = useParams();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);

  const datasetSampleInputsQuery = useQuery({
    queryKey: [
      "datasetSampleInputListData",
      {
        projectUuid: params?.projectUuid,
        datasetUuid: params?.datasetUuid,
        page: page,
      },
    ],
    queryFn: async () =>
      await fetchDatasetSampleInputs({
        dataset_uuid: params?.datasetUuid as string,
        page: page,
        rows_per_page: ROWS_PER_PAGE,
      }),
    enabled: !!params?.datasetUuid,
  });

  const datasetSampleInputsCountQuery = useQuery({
    queryKey: [
      "datasetSampleInputsCount",
      {
        projectUuid: params?.projectUuid,
        datasetUuid: params?.datasetUuid,
      },
    ],
    queryFn: async () =>
      await fetchDatasetSampleInputsCount({
        dataset_uuid: params?.datasetUuid as string,
      }),
    enabled: !!params?.datasetUuid,
  });

  const postDatasetSampleInputsMutation = useMutation({
    mutationKey: ["postDatasetSampleInputs"],
    mutationFn: async (
      requestData: Omit<PostDatasetSampleInputsRequest, "dataset_uuid">
    ) =>
      await postDatasetSampleInputs({
        dataset_uuid: params?.datasetUuid as string,
        ...requestData,
      }),
    onSuccess: () => datasetSampleInputsQuery.refetch(),
  });

  const updateSampleInputMutation = useMutation({
    mutationKey: ["updateSampleInput"],
    mutationFn: updateSampleInput,
    onSuccess: (data: SampleInput) => {
      const previousData = datasetSampleInputsQuery.data;
      const newData = previousData?.map((sampleInput) => {
        if (sampleInput.uuid === data.uuid) {
          return data;
        }
        return sampleInput;
      });
      queryClient.setQueryData(
        [
          "datasetSampleInputListData",
          {
            projectUuid: params?.projectUuid,
            datasetUuid: params?.datasetUuid,
            page: page,
          },
        ],
        newData
      );
    },
  });

  return {
    datasetUuid: params?.datasetUuid as string,
    datasetSampleInputsQuery,
    datasetSampleInputsCountQuery,
    postDatasetSampleInputsMutation,
    updateSampleInputMutation,
    page,
    setPage,
  };
};
