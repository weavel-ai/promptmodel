import { railwayWebClient } from "@/apis/base";
import { CreateFunctionModelRequest } from "@/types/FunctionModel";
import { FunctionModel } from "@/types/FunctionModel";

/**
 * Creates a new FunctionModel in the system.
 * @param functionModelData - The data required to create a new FunctionModel.
 * @returns A promise that resolves to the FunctionModel interface.
 */
export async function createFunctionModel(
  functionModelData: CreateFunctionModelRequest
): Promise<FunctionModel> {
  const response = await railwayWebClient.post(
    "/function_models",
    functionModelData
  );
  return response.data;
}
