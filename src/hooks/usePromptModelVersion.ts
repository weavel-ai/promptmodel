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
import { arePrimitiveListsEqual, cloneDeep } from "@/utils";
import { usePromptModel } from "./usePromptModel";

export const usePromptModelVersion = () => {
  const params = useParams();
  const queryClient = useQueryClient();
  const { supabase } = useSupabaseClient();
  const { projectData } = useProject();
  const { promptModelData } = usePromptModel();
  const {
    newVersionCache,
    isCreateVariantOpen,
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
    queryKey: [
      "promptModelVersionListData",
      { promptModelUuid: params?.promptModelUuid },
    ],
    queryFn: async () =>
      await fetchPromptModelVersions(
        supabase,
        params?.promptModelUuid as string
      ),
    enabled: !!supabase && !!params?.promptModelUuid,
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
      await fetchPrompts(supabase, selectedPromptModelVersionUuid),
    enabled: !!supabase && !!selectedPromptModelVersionUuid,
  });

  const { data: originalPromptModelVersionData } = useQuery({
    queryKey: [
      "promptModelVersionData",
      { uuid: selectedPromptModelVersionUuid },
    ],
    queryFn: async () =>
      await fetchPromptModelVersion(supabase, selectedPromptModelVersionUuid),
    enabled: !!supabase && !!selectedPromptModelVersionUuid,
  });

  useEffect(() => {
    if (!originalPromptListData) return;
    if (!selectedPromptModelVersionUuid) return;
    updatePrompts(selectedPromptModelVersionUuid, originalPromptListData);
    setModifiedPrompts(cloneDeep(originalPromptListData));
  }, [
    originalPromptListData,
    selectedPromptModelVersionUuid,
    setModifiedPrompts,
    updatePrompts,
  ]);

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
  }, [
    originalPromptModelVersionData,
    setOutputKeys,
    setSelectedFunctions,
    setSelectedModel,
    setSelectedParser,
  ]);

  const isEqualToOriginal = useMemo(() => {
    if (isCreateVariantOpen) {
      const promptsEqual = originalPromptListData?.every((prompt, index) =>
        Object.keys(prompt)?.every(
          (key) => prompt[key] == modifiedPrompts[index][key]
        )
      );

      const modelEqual = originalPromptModelVersionData?.model == selectedModel;
      const parserEqual =
        originalPromptModelVersionData?.parsing_type == selectedParser;
      const functionsEqual = arePrimitiveListsEqual(
        originalPromptModelVersionData?.functions ?? [],
        selectedFunctions
      );

      return promptsEqual && modelEqual && parserEqual && functionsEqual;
    }
    return true;
  }, [
    isCreateVariantOpen,
    originalPromptListData,
    originalPromptModelVersionData,
    selectedModel,
    selectedParser,
    selectedFunctions,
    modifiedPrompts,
  ]);

  const isEqualToCache = useMemo(() => {
    if (isCreateVariantOpen && newVersionCache) {
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
  async function handleRun(onRightSide: boolean) {
    const toastId = toast.loading("Running...");
    let prompts: Prompt[];
    let versionUuid: string;

    if (onRightSide) {
      prompts = modifiedPrompts;
      versionUuid = isEqualToCache ? newVersionCache?.uuid : null;
    } else {
      prompts = originalPromptListData;
      versionUuid = originalPromptModelVersionData?.uuid;
    }
    let cacheRawOutput = "";
    const cacheParsedOutputs = {};
    let cacheFunctionCallData = {};

    const uuid = uuidv4();
    const args: any = {
      projectUuid: params?.projectUuid as string,
      promptModelUuid: params?.promptModelUuid as string,
      prompts: prompts,
      model: onRightSide ? selectedModel : originalPromptModelVersionData.model,
      fromVersion: onRightSide ? originalPromptModelVersionData?.version : null,
      versionUuid: onRightSide
        ? (isEqualToCache ? newVersionCache?.uuid : null) ?? null
        : originalPromptModelVersionData?.uuid,
      sampleName: selectedSample,
      parsingType: onRightSide
        ? selectedParser
        : originalPromptModelVersionData?.parsing_type,
      outputKeys: onRightSide
        ? outputKeys
        : originalPromptModelVersionData?.output_keys,
      functions: onRightSide
        ? selectedFunctions
        : originalPromptModelVersionData?.functions,
      onNewData: async (data) => {
        console.log(data);
        if (data?.status) {
          console.log(data.status);
          console.log(toastId);
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
        if (data?.prompt_model_version_uuid) {
          versionUuid = data?.prompt_model_version_uuid;
          setNewVersionCache({
            uuid: data?.prompt_model_version_uuid,
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
    if (projectData?.online) {
      await streamLocalPromptModelRun(args);
    } else {
      await streamPromptModelRun(args);
    }

    if (onRightSide) {
      await refetchPromptModelVersionListData();
      if (!originalPromptModelVersionData?.uuid) {
        setSelectedPromptModelVersion(newVersionCache?.version);
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
    promptModelUuid: params?.promptModelUuid as string,
    selectedPromptModelVersionUuid,
    promptModelVersionListData,
    originalPromptListData,
    originalPromptModelVersionData,
    refetchPromptModelVersionListData,
    handleRun,
    isEqualToCache,
    isEqualToOriginal,
  };
};
