import { webServerClient } from "@/apis/base";
import { ReadFunctionModelsRequest } from "@/types/FunctionModel";
import { FunctionModel } from "@/types/FunctionModel";

/**
 * Reads a project's FunctionModels.
 * @param projectData - The data required to fetch FunctionModels.
 * @returns A promise that resolves to a list of the FunctionModel interface.
 */
export async function fetchFunctionModels(
  projectData: ReadFunctionModelsRequest
): Promise<Array<FunctionModel>> {
  const response = await webServerClient.get("/function_models", {
    params: projectData,
  });
  return response.data;
}
