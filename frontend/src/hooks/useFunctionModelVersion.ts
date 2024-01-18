import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
  createFunctionModelVersion,
  fetchFunctionModelVersion,
  fetchFunctionModelVersions,
} from "@/apis/function_model_versions";
import { CreateFunctionModelVersionRequest } from "@/types/FunctionModelVersion";
import { saveRunLogs } from "@/apis/run_logs";
import { saveRunLogsRequest } from "@/types/RunLog";
import { fetchPrompts } from "@/apis/prompts";
import { ParsingType } from "@/types/ParsingType";
import { Prompt } from "@/types/Prompt";
import { version } from "os";
import { StdioNull } from "child_process";
import { useUser } from "@clerk/nextjs";

export const useFunctionModelVersion = () => {
  const params = useParams();
  const queryClient = useQueryClient();
  const { projectData } = useProject();
  const { user } = useUser();

  useEffect(() => {
    console.log(user);
    console.log(user?.imageUrl);
    console.log(user?.web3Wallets);
  }, [user]);

  const {
    runLogs,
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

  async function handleSave() {
    // toast
    const toastId = toast.loading("Saving...");
    setTimeout(() => {
      if (toast.isActive(toastId)) {
        toast.dismiss();
      }
    }, 6000);

    const res = await createFunctionModelVersion({
      project_uuid: projectData?.uuid as string,
      function_model_uuid: params?.functionModelUuid as string,
      prompts: modifiedPrompts,
      model: selectedModel,
      from_version: originalFunctionModelVersionData?.version,
      parsing_type: selectedParser,
      output_keys: outputKeys,
      functions: selectedFunctions,
      created_by: user.id,
    } as CreateFunctionModelVersionRequest);

    // clear all of run log cache where versionUuid is same with newVersionCache.uuid
    await queryClient.invalidateQueries([
      "runLogData",
      {
        versionUuid: newVersionCache?.uuid,
      },
    ]);

    const oldVersionUuidCache = newVersionCache?.uuid;

    setNewVersionCache({
      uuid: res.uuid,
      version: res.version,
      prompts: cloneDeep(modifiedPrompts),
      model: selectedModel,
      parsing_type: selectedParser,
      functions: cloneDeep(selectedFunctions),
    });

    // save all the run logs
    const new_run_logs = await saveRunLogs(
      res.uuid,
      Object?.values(runLogs[oldVersionUuidCache] || {}).map((runLog) => {
        return {
          inputs: runLog.inputs,
          raw_output: runLog.raw_output,
          parsed_outputs: runLog.parsed_outputs,
          function_call: runLog.function_call,
          sample_input_uuid: runLog.sample_input_uuid,
          run_log_metadata: runLog.run_log_metadata,
        };
      }) as saveRunLogsRequest[]
    );

    if (new_run_logs == null) {
      toast.update(toastId, {
        containerId: "default",
        render: "Failed to save run logs",
        type: "error",
        autoClose: 4000,
        isLoading: false,
      });
    }

    Object.values(new_run_logs).forEach((runLog) => {
      updateRunLogs(res.uuid, runLog.uuid, {
        inputs: runLog.inputs,
        raw_output: runLog.raw_output,
        parsed_outputs: runLog.parsed_outputs,
        function_call: runLog.function_call,
        sample_input_uuid: runLog.sample_input_uuid,
        run_log_metadata: runLog.run_log_metadata,
      });
    });

    // update the dashboard
    await refetchFunctionModelVersionListData();
    if (!originalFunctionModelVersionData?.uuid) {
      // when initial stage
      setSelectedFunctionModelVersion(newVersionCache?.version);
    }

    toast.update(toastId, {
      containerId: "default",
      render: "Completed",
      type: "success",
      autoClose: 2000,
      isLoading: false,
    });
  }

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
    if (modifiedPrompts?.length > 0 && newVersionCache) {
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
    newVersionCache,
    selectedModel,
    selectedParser,
    selectedFunctions,
    modifiedPrompts,
  ]);

  // Run LLM call
  async function handleRun(
    isNewOrCachedVersion: boolean,
    sampleInput?: Record<string, string>,
    sampleInputUuid?: string | null
  ) {
    const toastId = toast.loading("Running...");
    let prompts: Prompt[];
    let versionUuid: string;
    let versionUuidForDraft: string;

    if (isNewOrCachedVersion) {
      prompts = modifiedPrompts;
      versionUuid = isEqualToCache
        ? newVersionCache
          ? newVersionCache.uuid
          : `DRAFT_${uuidv4() as string}`
        : `DRAFT_${uuidv4() as string}`;
      versionUuidForDraft = cloneDeep(versionUuid);
    } else {
      prompts = originalPromptListData;
      versionUuid = originalFunctionModelVersionData?.uuid;
      versionUuidForDraft = cloneDeep(versionUuid);
    }
    let cacheRawOutput = "";
    const cacheParsedOutputs = {};
    let cacheFunctionCallData = {};

    const uuid = uuidv4(); // new RunLog UUID, only used in frontend
    const args: any = {
      projectUuid: params?.projectUuid as string,
      functionModelUuid: params?.functionModelUuid as string,
      sampleInputUuid: sampleInputUuid as string,
      prompts: prompts,
      model: isNewOrCachedVersion
        ? selectedModel
        : originalFunctionModelVersionData.model,
      fromVersion: isNewOrCachedVersion
        ? originalFunctionModelVersionData?.version
        : null,
      versionUuuidForDraft: versionUuidForDraft,
      versionUuid: versionUuid?.startsWith("DRAFT") ? null : versionUuid,
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
              if (versionUuid && !versionUuid.startsWith("DRAFT")) {
                await queryClient.invalidateQueries([
                  "runLogData",
                  {
                    versionUuid: versionUuid,
                  },
                ]);
                removeRunLog(versionUuid, uuid);
              }
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

        if (versionUuidForDraft.startsWith("DRAFT")) {
          setNewVersionCache({
            uuid: versionUuidForDraft,
            prompts: cloneDeep(prompts),
            model: selectedModel,
            parsing_type: selectedParser,
            functions: cloneDeep(selectedFunctions),
          });
        }

        if (data?.sample_input_uuid) {
          updateRunLogs(versionUuidForDraft, uuid, {
            sample_input_uuid: data?.sample_input_uuid,
          });
        }

        if (data?.inputs) {
          updateRunLogs(versionUuidForDraft, uuid, {
            inputs: data?.inputs,
          });
        }
        if (data?.raw_output) {
          cacheRawOutput += data?.raw_output;
          updateRunLogs(versionUuidForDraft, uuid, {
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
          updateRunLogs(versionUuidForDraft, uuid, {
            parsed_outputs: cacheParsedOutputs,
          });
        }
        if (data?.function_call) {
          cacheFunctionCallData = data?.function_call;
          // functionCallData["initial_raw_output"] = cacheRawOutput;
          updateRunLogs(versionUuidForDraft, uuid, {
            // raw_output: "",
            function_call: cacheFunctionCallData,
          });
          // cacheRawOutput = "";
        }
        if (data?.function_response) {
          cacheFunctionCallData["response"] = data?.function_response;
          updateRunLogs(versionUuidForDraft, uuid, {
            function_call: cacheFunctionCallData,
          });
        }

        if (data?.log && data?.status == "failed") {
          updateRunLogs(versionUuidForDraft, uuid, {
            run_log_metadata: {
              error: true,
              error_log: data?.log,
            },
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
    handleSave,
    handleRun,
    isEqualToCache,
    isEqualToOriginal,
  };
};
