import { useSupabaseClient } from "@/apis/base";
import { fetchOrganization } from "@/apis/organization";
import { fetchProject, fetchProjects } from "@/apis/project";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { useProject } from "./useProject";
import { fetchPromptModels } from "@/apis/promptModel";
import {
  fetchPromptModelVersion,
  fetchPromptModelVersions,
} from "@/apis/promptModelVersion";
import { toast } from "react-toastify";
import {
  Prompt,
  usePromptModelVersionStore,
} from "@/stores/promptModelVersionStore";
import { v4 as uuidv4 } from "uuid";
import { useEffect, useMemo } from "react";
import { fetchPrompts } from "@/apis/prompt";
import { streamLocalPromptModelRun, streamPromptModelRun } from "@/apis/stream";
import { useRunLogs } from "./useRunLog";
import { cloneDeep } from "@/utils";
import { usePromptModel } from "./usePromptModel";

export const usePromptModelVersion = () => {
  const params = useParams();
  const queryClient = useQueryClient();
  const { createSupabaseClient } = useSupabaseClient();
  const { promptModelData } = usePromptModel();
  const {
    newVersionCache,
    selectedPromptModelVersion,
    modifiedPrompts,
    setModifiedPrompts,
    selectedSample,
    selectedModel,
    outputKeys,
    selectedParser,
    selectedFunctions,
    setOutputKeys,
    setSelectedModel,
    setSelectedParser,
    updateRunLogs,
    updatePrompts,
    removeRunLog,
    setSelectedPromptModelVersion,
    setNewVersionCache,
    setSelectedFunctions,
  } = usePromptModelVersionStore();

  const {
    data: promptModelVersionListData,
    refetch: refetchPromptModelVersionListData,
  } = useQuery({
    queryKey: ["versionListData", { promptModelUuid: params?.promptModelUuid }],
    queryFn: async () =>
      await fetchPromptModelVersions(
        await createSupabaseClient(),
        params?.promptModelUuid as string
      ),
    enabled:
      params?.promptModelUuid != undefined && params?.promptModelUuid != null,
  });

  const selectedPromptModelVersionUuid = useMemo(() => {
    if (!selectedPromptModelVersion) return null;
    return promptModelVersionListData?.find(
      (data) => data.version === selectedPromptModelVersion
    )?.uuid;
  }, [selectedPromptModelVersion, promptModelVersionListData]);

  const { data: originalPromptListData } = useQuery({
    queryKey: [
      "promptListData",
      { versionUuid: selectedPromptModelVersionUuid },
    ],
    queryFn: async () =>
      await fetchPrompts(
        await createSupabaseClient(),
        selectedPromptModelVersionUuid
      ),
    enabled:
      selectedPromptModelVersionUuid != undefined &&
      selectedPromptModelVersionUuid != null,
  });

  const { data: originalPromptModelVersionData } = useQuery({
    queryKey: [
      "promptModelVersionData",
      { uuid: selectedPromptModelVersionUuid },
    ],
    queryFn: async () =>
      await fetchPromptModelVersion(
        await createSupabaseClient(),
        selectedPromptModelVersionUuid
      ),
    enabled:
      selectedPromptModelVersionUuid != undefined &&
      selectedPromptModelVersionUuid != null,
  });

  useEffect(() => {
    if (!originalPromptListData) return;
    if (!selectedPromptModelVersionUuid) return;
    updatePrompts(selectedPromptModelVersionUuid, originalPromptListData);
    setModifiedPrompts(cloneDeep(originalPromptListData));
  }, [originalPromptListData, selectedPromptModelVersionUuid]);

  useEffect(() => {
    if (!originalPromptModelVersionData) return;
    if (originalPromptModelVersionData?.model) {
      setSelectedModel(originalPromptModelVersionData?.model);
    }
    if (originalPromptModelVersionData?.parsing_type != null) {
      setSelectedParser(originalPromptModelVersionData?.parsing_type);
      setOutputKeys(originalPromptModelVersionData?.output_keys);
    } else {
      setSelectedParser(null);
      setOutputKeys([]);
    }
    if (originalPromptModelVersionData?.functions != null) {
      setSelectedFunctions(originalPromptModelVersionData?.functions);
    } else {
      setSelectedFunctions([]);
    }
  }, [originalPromptModelVersionData]);

  // Run LLM call
  async function handleRun(isNew: boolean) {
    const toastId = toast.loading("Running...");
    let prompts: Prompt[];
    let newVersionUuid: string;

    if (isNew) {
      prompts = modifiedPrompts;
    } else {
      prompts = originalPromptListData;
    }
    let cacheRawOutput = "";
    const cacheParsedOutputs = {};
    let cacheFunctionCallData = {};

    const uuid = uuidv4();
    const args: any = {
      projectUuid: params?.projectUuid as string,
      promptModelUuid: params?.promptModelUuid as string,
      prompts: prompts,
      model: isNew ? selectedModel : originalPromptModelVersionData.model,
      fromVersion: isNew ? originalPromptModelVersionData?.version : null,
      versionUuid: isNew ? null : originalPromptModelVersionData?.uuid,
      sampleName: selectedSample,
      parsingType: isNew
        ? selectedParser
        : originalPromptModelVersionData?.parsing_type,
      outputKeys: isNew
        ? outputKeys
        : originalPromptModelVersionData?.output_keys,
      functions: isNew
        ? selectedFunctions
        : originalPromptModelVersionData?.functions,
      onNewData: async (data) => {
        console.log(data);
        switch (data?.status) {
          case "completed":
            queryClient.invalidateQueries([
              "runLogData",
              {
                versionUuid: isNew
                  ? newVersionUuid
                  : originalPromptModelVersionData?.uuid,
              },
            ]);
            removeRunLog(
              isNew ? newVersionUuid : originalPromptModelVersionData?.uuid,
              uuid
            );
            toast.update(toastId, {
              render: "Completed",
              type: "success",
              autoClose: 2000,
              isLoading: false,
            });
            break;
          case "failed":
            queryClient.invalidateQueries([
              "runLogData",
              {
                versionUuid: isNew
                  ? newVersionUuid
                  : originalPromptModelVersionData?.uuid,
              },
            ]);
            removeRunLog(
              isNew ? newVersionUuid : originalPromptModelVersionData?.uuid,
              uuid
            );
            toast.update(toastId, {
              render: data?.log,
              type: "error",
              autoClose: 4000,
              isLoading: false,
            });
            break;
        }
        if (data?.prompt_model_version_uuid) {
          newVersionUuid = data?.prompt_model_version_uuid;
          setNewVersionCache({
            uuid: data?.prompt_model_version_uuid,
            version: data?.version,
            prompts: cloneDeep(prompts),
            model: originalPromptModelVersionData?.model,
            parsing_type: originalPromptModelVersionData?.parsing_type,
            functions: originalPromptModelVersionData?.functions,
          });
        }
        if (data?.inputs) {
          updateRunLogs(
            isNew ? newVersionUuid : originalPromptModelVersionData?.uuid,
            uuid,
            {
              inputs: data?.inputs,
            }
          );
        }
        if (data?.raw_output) {
          cacheRawOutput += data?.raw_output;
          updateRunLogs(
            isNew ? newVersionUuid : originalPromptModelVersionData?.uuid,
            uuid,
            {
              raw_output: cacheRawOutput,
            }
          );
        }
        if (data?.parsed_outputs) {
          const parsedOutputs = data?.parsed_outputs;
          for (const key in parsedOutputs) {
            if (key in cacheParsedOutputs) {
              cacheParsedOutputs[key] += parsedOutputs[key];
            } else {
              cacheParsedOutputs[key] = parsedOutputs[key];
            }
          }
          updateRunLogs(
            isNew ? newVersionUuid : originalPromptModelVersionData?.uuid,
            uuid,
            {
              parsed_outputs: cacheParsedOutputs,
            }
          );
        }
        if (data?.function_call) {
          cacheFunctionCallData = data?.function_call;
          // functionCallData["initial_raw_output"] = cacheRawOutput;
          updateRunLogs(
            isNew ? newVersionUuid : originalPromptModelVersionData?.uuid,
            uuid,
            {
              // raw_output: "",
              function_call: cacheFunctionCallData,
            }
          );
          // cacheRawOutput = "";
        }
        if (data?.function_response) {
          cacheFunctionCallData["response"] = data?.function_response;
          updateRunLogs(
            isNew ? newVersionUuid : originalPromptModelVersionData?.uuid,
            uuid,
            {
              function_call: cacheFunctionCallData,
            }
          );
        }
      },
    };
    if (promptModelData?.online) {
      await streamLocalPromptModelRun(args);
    } else {
      await streamPromptModelRun(args);
    }

    if (isNew) {
      refetchPromptModelVersionListData();
      if (!originalPromptModelVersionData?.uuid) {
        setSelectedPromptModelVersion(newVersionCache?.version);
      }
    }
  }

  return {
    promptModelUuid: params?.promptModelUuid as string,
    selectedPromptModelVersionUuid,
    promptModelVersionListData,
    originalPromptListData,
    originalPromptModelVersionData,
    refetchPromptModelVersionListData,
    handleRun,
  };
};
