import { Project } from "@/types/Project";
import { webServerClient } from "../base";
import { useEffect } from "react";
import {
  FunctionModel,
  PublicFunctionModel,
  ReadPublicFunctionModelsRequest,
} from "@/types/FunctionModel";

export async function fetchPublicFunctionModels(
  requestData: ReadPublicFunctionModelsRequest
): Promise<Array<PublicFunctionModel>> {
  const { ...params } = requestData;
  const response = await webServerClient.get("/explore/function_models", {
    params: params,
  });

  return response.data;
}
