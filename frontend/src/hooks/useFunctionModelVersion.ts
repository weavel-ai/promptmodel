import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { useProject } from "./useProject";
import { toast } from "react-toastify";
import { useFunctionModelVersionStore } from "@/stores/functionModelVersionStore";
import { v4 as uuidv4 } from "uuid";
import { useEffect, useMemo } from "react";
import {
  streamLocalFunctionModelRun,
  streamFunctionModelRun,
} from "@/apis/stream";
import { arePrimitiveListsEqual, cloneDeep, parseMultipleJson } from "@/utils";
import {
  fetchFunctionModelVersion,
  fetchFunctionModelVersions,
} from "@/apis/function_model_versions";
import { fetchPrompts } from "@/apis/prompts";
import { ParsingType } from "@/types/ParsingType";
import { Prompt } from "@/types/Prompt";

export const useFunctionModelVersion = () => {
  const params = useParams();
  const queryClient = useQueryClient();
  const { projectData } = useProject();
  const {
    newVersionCache,
    isCreateVariantOpen,
    selectedFunctionModelVersion,
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
    setSelectedFunctionModelVersion,
    setNewVersionCache,
    setSelectedFunctions,
  } = useFunctionModelVersionStore();

  const {
    data: functionModelVersionListData,
    refetch: refetchFunctionModelVersionListData,
  } = useQuery({
    queryKey: [
      "functionModelVersionListData",
      { functionModelUuid: params?.functionModelUuid },
    ],
    queryFn: async () =>
      await fetchFunctionModelVersions({
        function_model_uuid: params?.functionModelUuid as string,
      }),
    enabled: !!params?.functionModelUuid,
  });

  const selectedFunctionModelVersionUuid = useMemo(() => {
    if (!selectedFunctionModelVersion) return null;
    return functionModelVersionListData?.find(
      (data) => data.version === selectedFunctionModelVersion
    )?.uuid;
  }, [selectedFunctionModelVersion, functionModelVersionListData]);

  const { data: originalPromptListData } = useQuery({
    queryKey: [
      "promptListData",
      { versionUuid: selectedFunctionModelVersionUuid },
    ],
    queryFn: async () =>
      await fetchPrompts({
        function_model_version_uuid: selectedFunctionModelVersionUuid,
      }),
    enabled: !!selectedFunctionModelVersionUuid,
  });

  const { data: originalFunctionModelVersionData } = useQuery({
    queryKey: [
      "functionModelVersionData",
      { uuid: selectedFunctionModelVersionUuid },
    ],
    queryFn: async () =>
      await fetchFunctionModelVersion({
        uuid: selectedFunctionModelVersionUuid,
      }),
    enabled: !!selectedFunctionModelVersionUuid,
  });

  useEffect(() => {
    if (!originalPromptListData) return;
    if (!selectedFunctionModelVersionUuid) return;
    updatePrompts(selectedFunctionModelVersionUuid, originalPromptListData);
    setModifiedPrompts(cloneDeep(originalPromptListData));
  }, [
    originalPromptListData,
    selectedFunctionModelVersionUuid,
    setModifiedPrompts,
    updatePrompts,
  ]);

  useEffect(() => {
    if (!originalFunctionModelVersionData) return;
    if (originalFunctionModelVersionData?.model) {
      setSelectedModel(originalFunctionModelVersionData?.model);
    }
    if (originalFunctionModelVersionData?.parsing_type != null) {
      setSelectedParser(
        originalFunctionModelVersionData?.parsing_type as ParsingType
      );
      setOutputKeys(originalFunctionModelVersionData?.output_keys);
    } else {
      setSelectedParser(null);
      setOutputKeys([]);
    }
    if (originalFunctionModelVersionData?.functions != null) {
      setSelectedFunctions(originalFunctionModelVersionData?.functions);
    } else {
      setSelectedFunctions([]);
    }
  }, [
    originalFunctionModelVersionData,
    setOutputKeys,
    setSelectedFunctions,
    setSelectedModel,
    setSelectedParser,
  ]);

  const isEqualToOriginal = useMemo(() => {
    if (modifiedPrompts?.length > 0 && isCreateVariantOpen) {
      const promptsEqual = originalPromptListData?.every((prompt, index) =>
        Object.keys(prompt)?.every(
          (key) => prompt[key] == modifiedPrompts[index][key]
        )
      );

      const modelEqual =
        originalFunctionModelVersionData?.model == selectedModel;
      const parserEqual =
        originalFunctionModelVersionData?.parsing_type == selectedParser;
      const functionsEqual = arePrimitiveListsEqual(
        originalFunctionModelVersionData?.functions ?? [],
        selectedFunctions
      );

      return promptsEqual && modelEqual && parserEqual && functionsEqual;
    }
    return true;
  }, [
    isCreateVariantOpen,
    originalPromptListData,
    originalFunctionModelVersionData,
    selectedModel,
    selectedParser,
    selectedFunctions,
    modifiedPrompts,
  ]);

  const isEqualToCache = useMemo(() => {
    if (modifiedPrompts?.length > 0 && isCreateVariantOpen && newVersionCache) {
      const promptsEqual = newVersionCache?.prompts.every((prompt, index) =>
        Object.keys(prompt).every(
          (key) => prompt[key] == modifiedPrompts[index][key]
        )
      );

      const modelEqual = newVersionCache?.model == selectedModel;
      const parserEqual = newVersionCache?.parsing_type == selectedParser;
      const functionsEqual = arePrimitiveListsEqual(
        newVersionCache?.functions,
        selectedFunctions
      );

      return promptsEqual && modelEqual && parserEqual && functionsEqual;
    }
    return true;
  }, [
    isCreateVariantOpen,
    newVersionCache,
    selectedModel,
    selectedParser,
    selectedFunctions,
    modifiedPrompts,
  ]);

  // Run LLM call
  async function handleRun(
    isNewOrCachedVersion: boolean,
    sampleInput?: Record<string, string>
  ) {
    const toastId = toast.loading("Running...");
    let prompts: Prompt[];
    let versionUuid: string;

    if (isNewOrCachedVersion) {
      prompts = modifiedPrompts;
      versionUuid = isEqualToCache ? newVersionCache?.uuid : null;
    } else {
      prompts = originalPromptListData;
      versionUuid = originalFunctionModelVersionData?.uuid;
    }
    let cacheRawOutput = "";
    const cacheParsedOutputs = {};
    let cacheFunctionCallData = {};

    const uuid = uuidv4();
    const args: any = {
      projectUuid: params?.projectUuid as string,
      functionModelUuid: params?.functionModelUuid as string,
      prompts: prompts,
      model: isNewOrCachedVersion
        ? selectedModel
        : originalFunctionModelVersionData.model,
      fromVersion: isNewOrCachedVersion
        ? originalFunctionModelVersionData?.version
        : null,
      versionUuid: isNewOrCachedVersion
        ? (isEqualToCache ? newVersionCache?.uuid : null) ?? null
        : originalFunctionModelVersionData?.uuid,
      sampleInput: sampleInput,
      parsingType: isNewOrCachedVersion
        ? selectedParser
        : originalFunctionModelVersionData?.parsing_type,
      outputKeys: isNewOrCachedVersion
        ? outputKeys
        : originalFunctionModelVersionData?.output_keys,
      functions: isNewOrCachedVersion
        ? selectedFunctions
        : originalFunctionModelVersionData?.functions,
      onNewData: async (data) => {
        if (data?.status) {
          switch (data?.status) {
            case "completed":
              toast.update(toastId, {
                containerId: "default",
                render: "Completed",
                type: "success",
                autoClose: 2000,
                isLoading: false,
              });
              await queryClient.invalidateQueries([
                "runLogData",
                {
                  versionUuid: versionUuid,
                },
              ]);
              removeRunLog(versionUuid, uuid);
              break;
            case "failed":
              toast.update(toastId, {
                containerId: "default",
                render: data?.log,
                type: "error",
                autoClose: 4000,
                isLoading: false,
              });
              await queryClient.invalidateQueries([
                "runLogData",
                {
                  versionUuid: versionUuid,
                },
              ]);
              removeRunLog(versionUuid, uuid);
              break;
          }
        }
        if (data?.function_model_version_uuid) {
          versionUuid = data?.function_model_version_uuid;
          setNewVersionCache({
            uuid: data?.function_model_version_uuid,
            version: data?.version,
            prompts: cloneDeep(prompts),
            model: selectedModel,
            parsing_type: selectedParser,
            functions: cloneDeep(selectedFunctions),
          });
        }
        if (data?.inputs) {
          updateRunLogs(versionUuid, uuid, {
            inputs: data?.inputs,
          });
        }
        if (data?.raw_output) {
          cacheRawOutput += data?.raw_output;
          updateRunLogs(versionUuid, uuid, {
            raw_output: cacheRawOutput,
          });
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
          updateRunLogs(versionUuid, uuid, {
            parsed_outputs: cacheParsedOutputs,
          });
        }
        if (data?.function_call) {
          cacheFunctionCallData = data?.function_call;
          // functionCallData["initial_raw_output"] = cacheRawOutput;
          updateRunLogs(versionUuid, uuid, {
            // raw_output: "",
            function_call: cacheFunctionCallData,
          });
          // cacheRawOutput = "";
        }
        if (data?.function_response) {
          cacheFunctionCallData["response"] = data?.function_response;
          updateRunLogs(versionUuid, uuid, {
            function_call: cacheFunctionCallData,
          });
        }
      },
    };
    try {
      if (projectData?.online) {
        await streamLocalFunctionModelRun(args);
      } else {
        await streamFunctionModelRun(args);
      }
    } catch (e) {
      console.log(e);
      toast.update(toastId, {
        render: e?.detail,
        type: "error",
        autoClose: 5000,
        closeButton: true,
        closeOnClick: true,
        isLoading: false,
      });
    }

    if (isNewOrCachedVersion) {
      await refetchFunctionModelVersionListData();
      if (!originalFunctionModelVersionData?.uuid) {
        setSelectedFunctionModelVersion(newVersionCache?.version);
      }
    }
    // If toast is still loading after 2 seconds, remove it
    setTimeout(() => {
      if (toast.isActive(toastId)) {
        toast.dismiss();
      }
    }, 2000);
  }

  return {
    functionModelUuid: params?.functionModelUuid as string,
    selectedFunctionModelVersionUuid,
    functionModelVersionListData,
    originalPromptListData,
    originalFunctionModelVersionData,
    refetchFunctionModelVersionListData,
    handleRun,
    isEqualToCache,
    isEqualToOriginal,
  };
};
