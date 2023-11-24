import { useSupabaseClient } from "@/apis/base";
import { fetchOrganization } from "@/apis/organization";
import { fetchProject, fetchProjects } from "@/apis/project";
import { useQuery } from "@tanstack/react-query";
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
import { useMemo } from "react";
import { fetchPrompts } from "@/apis/prompt";
import { streamPromptModelRun } from "@/apis/stream";
import { useRunLogs } from "./useRunLog";
import { cloneDeep } from "@/utils";

export const usePromptModelVersion = () => {
  const params = useParams();
  const { createSupabaseClient } = useSupabaseClient();
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
    onSuccess: (data) => {
      updatePrompts(selectedPromptModelVersionUuid, data);
      setModifiedPrompts(cloneDeep(data));
    },
    enabled:
      selectedPromptModelVersionUuid != undefined &&
      selectedPromptModelVersionUuid != null,
  });

  const { refetchRunLogData } = useRunLogs(selectedPromptModelVersionUuid);

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
    onSuccess: (data) => {
      if (data?.model) {
        setSelectedModel(data?.model);
      }
      if (data?.parsing_type != null) {
        setSelectedParser(data?.parsing_type);
        setOutputKeys(data?.output_keys);
      } else {
        setSelectedParser(null);
        setOutputKeys([]);
      }
    },
    enabled:
      selectedPromptModelVersionUuid != undefined &&
      selectedPromptModelVersionUuid != null,
  });

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
        switch (data?.status) {
          case "completed":
            await refetchRunLogData();
            removeRunLog(
              isNew ? "new" : originalPromptModelVersionData?.uuid,
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
            await refetchRunLogData();
            removeRunLog(
              isNew ? "new" : originalPromptModelVersionData?.uuid,
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
          setNewVersionCache({
            uuid: data?.prompt_model_version_uuid,
            version: data?.version,
            prompts: prompts,
            model: originalPromptModelVersionData?.model,
            parsing_type: originalPromptModelVersionData?.parsing_type,
          });
        }
        if (data?.inputs) {
          updateRunLogs(
            isNew ? "new" : originalPromptModelVersionData?.uuid,
            uuid,
            {
              inputs: data?.inputs,
            }
          );
        }
        if (data?.raw_output) {
          toast("new");
          cacheRawOutput += data?.raw_output;
          updateRunLogs(
            isNew ? "new" : originalPromptModelVersionData?.uuid,
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
            isNew ? "new" : originalPromptModelVersionData?.uuid,
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
            isNew ? "new" : originalPromptModelVersionData?.uuid,
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
            isNew ? "new" : originalPromptModelVersionData?.uuid,
            uuid,
            {
              function_call: cacheFunctionCallData,
            }
          );
        }
      },
    };
    console.log(prompts);

    await streamPromptModelRun(args);
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
