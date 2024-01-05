import { webServerClient } from "@/apis/base";
import { ReadFunctionModelDatasetsRequest, Dataset } from "@/types/SampleInput";

/**
 * Reads a FunctionModel's Datasets.
 * @param requestData - The data required to fetch a FunctionModel's Datasets.
 * @returns A promise that resolves to a list of Dataset interface.
 */
export async function fetchFunctionModelDatasets(
  requestData: ReadFunctionModelDatasetsRequest
): Promise<Array<Dataset>> {
  const { function_model_uuid } = requestData;
  const response = await webServerClient.get(
    `/function_models/${function_model_uuid}/datasets`
  );
  return response.data;
}
