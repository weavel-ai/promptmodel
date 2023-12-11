import { railwayWebClient } from "@/apis/base";
import { FunctionModel } from "@/types/FunctionModel";
import { DeleteFunctionModelRequest } from "@/types/FunctionModel";

/**
 * Deletes a FunctionModel from the system.
 * @param functionModelData - The data required to delete a FunctionModel.
 * @returns A promise that resolves to the FunctionModel interface.
 */
export async function deleteFunctionModel(
  functionModelData: DeleteFunctionModelRequest
): Promise<FunctionModel> {
  const response = await railwayWebClient.delete(
    `/function_models/${functionModelData.uuid}`
  );
  return response.data;
}
