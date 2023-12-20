import { webServerClient } from "@/apis/base";
import { FunctionModel } from "@/types/FunctionModel";
import { EditFunctionModelRequest } from "@/types/FunctionModel";

/**
 * Edits a FunctionModel's information.
 * @param functionModelData - The data required to edit a FunctionModel.
 * @returns A promise that resolves to the FunctionModel interface.
 */
export async function editFunctionModel(
  functionModelData: EditFunctionModelRequest
): Promise<FunctionModel> {
  const { uuid, ...params } = functionModelData;
  const response = await webServerClient.patch(
    `/function_models/${uuid}`,
    {},
    {
      params: params,
    }
  );
  return response.data;
}
