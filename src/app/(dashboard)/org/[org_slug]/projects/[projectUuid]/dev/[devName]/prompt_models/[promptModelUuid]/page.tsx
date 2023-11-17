"use client";

import { hierarchy, tree, stratify } from "d3-hierarchy";
import { Drawer } from "@/components/Drawer";
import { usePromptModelVersion } from "@/hooks/dev/usePromptModelVersion";
import { usePromptModel } from "@/hooks/dev/usePromptModel";
import { usePromptModelVersionDetails } from "@/hooks/dev/usePromptModelVersionDetails";
import {
  Prompt,
  RunLog,
  usePromptModelVersionStore,
} from "@/stores/promptModelVersionStore";
import classNames from "classnames";
import { useEffect, useMemo, useRef, useState } from "react";
import ReactFlow, {
  Background,
  BackgroundVariant,
  Handle,
  Position,
} from "reactflow";
import { motion } from "framer-motion";
import {
  CaretDown,
  Command,
  CornersOut,
  GitBranch,
  Play,
  Trash,
  XCircle,
} from "@phosphor-icons/react";
import { Monaco, MonacoDiffEditor } from "@monaco-editor/react";
import { editor } from "monaco-editor/esm/vs/editor/editor.api";

import "reactflow/dist/style.css";
import { useHotkeys } from "react-hotkeys-hook";
import {
  streamPromptModelRun as streamLocalPromptModelRun,
  subscribeDevBranchStatus,
  updatePromptModelVersionStatus as updateLocalVersionStatus,
} from "@/apis/dev";
import { useParams } from "next/navigation";
import { StatusIndicator } from "@/components/StatusIndicator";
import { useSupabaseClient } from "@/apis/base";
import { toast } from "react-toastify";
import ReactJson from "react-json-view";
import { useRunLogs } from "@/hooks/dev/useRunLog";
import { v4 as uuidv4 } from "uuid";
import { PlusSquare } from "@phosphor-icons/react/dist/ssr";
import { ModelDisplay, ModelSelector } from "@/components/ModelSelector";
import { cloneDeep } from "@/utils";
import { SampleSelector } from "@/components/SampleSelector";
import { EMPTY_INPUTS_LABEL, useSamples } from "@/hooks/dev/useSample";
import { StatusSelector } from "@/components/select/StatusSelector";
import { ResizableSeparator } from "@/components/ResizableSeparator";
import { ParserTypeSelector } from "@/components/select/ParserTypeSelector";
import { TagsInput } from "react-tag-input-component";
import { Badge } from "@/components/ui/badge";
import { ParsingType } from "@/types/ParsingType";
import { SlashCommandOptions } from "@/components/select/SlashCommandOptions";
import {
  PromptDiffEditor,
  PromptEditor,
} from "@/components/editor/PromptEditor";
import { FunctionSelector } from "@/components/select/FunctionSelector";
import { useFunctions } from "@/hooks/dev/useFunctions";
import { useDevBranch } from "@/hooks/useDevBranch";
import {
  streamPromptModelRun,
  updatePromptModelVersionStatus,
} from "@/apis/devCloud";
import { ModalPortal } from "@/components/ModalPortal";

export default function Page() {
  const params = useParams();
  const { createSupabaseClient } = useSupabaseClient();
  const { promptModelListData } = usePromptModel();
  const {
    promptModelVersionListData: versionListData,
    refetchPromptModelVersionListData: refetchVersionListData,
  } = usePromptModelVersion();
  const { devBranchData } = useDevBranch();

  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [createVariantOpen, setCreateVariantOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState("gpt-3.5-turbo");
  const [outputKeys, setOutputKeys] = useState<string[]>([]);
  const [parser, selectParser] = useState<ParsingType | null>(null);
  const [hasRun, setHasRun] = useState(false);
  // Local dev environment
  const [selectedSample, setSelectedSample] =
    useState<string>(EMPTY_INPUTS_LABEL);
  const [selectedFunctions, setSelectedFunctions] = useState<string[]>([]);

  const {
    newVersionUuidCache,
    selectedPromptModelVersionUuid: selectedVersionUuid,
    focusedEditor,
    showSlashOptions,
    runLogs,
    updatePromptModelVersionLists: updateVersionLists,
    updateRunLogs,
    updatePrompts,
    removeRunLog,
    setSelectedPromptModelVersionUuid: setSelectedVersionUuid,
    setNewVersionUuidCache,
    setShowSlashOptions,
  } = usePromptModelVersionStore();

  const { promptListData } = usePromptModelVersionDetails(selectedVersionUuid);
  const { refetchRunLogData } = useRunLogs(selectedVersionUuid);
  const { refetchSampleList } = useSamples();
  const { refetchFunctionListData } = useFunctions();

  const [modifiedPrompts, setModifiedPrompts] = useState<Prompt[]>([]);
  const [lowerBoxHeight, setLowerBoxHeight] = useState(240);

  const nodeTypes = useMemo(() => ({ modelVersion: ModelVersionNode }), []);

  const modelVersionData = useMemo(() => {
    const data = versionListData?.find(
      (version) => version.uuid === selectedVersionUuid
    );
    if (data?.model) {
      setSelectedModel(data?.model);
    }
    if (data?.parsing_type != null) {
      selectParser(data?.parsing_type);
      setOutputKeys(data?.output_keys);
    } else {
      selectParser(null);
      setOutputKeys([]);
    }
    //console.log(data);
    return data;
  }, [selectedVersionUuid, versionListData]);

  const originalPrompts = useMemo(() => {
    if (!modifiedPrompts && promptListData?.length > 0) {
      setModifiedPrompts(cloneDeep(promptListData));
    }
    return promptListData?.map((prompt) => prompt.content);
  }, [promptListData]);

  useEffect(() => {
    setSelectedVersionUuid(null);
  }, []);

  useEffect(() => {
    if (promptListData) {
      setModifiedPrompts(cloneDeep(promptListData));
    } else {
      setModifiedPrompts([]);
    }
  }, [selectedVersionUuid, promptListData]);

  const isNewVersionReady = useMemo(() => {
    if (!createVariantOpen) return false;
    if (hasRun) return false;

    // console.log("===================");
    // console.log(
    //   !originalPrompts?.every(
    //     (val, idx) => val === modifiedPrompts[idx]?.content
    //   )
    // );
    // console.log(selectedModel != modelVersionData?.model);
    // console.log(modelVersionData?.parsing_type != parser);
    // console.log(
    //   modelVersionData?.parsing_type != null &&
    //     modelVersionData?.output_keys != outputKeys
    // );
    // console.log(modelVersionData?.functions != selectedFunctions);
    // console.log(modelVersionData?.functions);
    // console.log(selectedFunctions);
    // console.log("===================");

    return (
      !originalPrompts?.every(
        (val, idx) => val === modifiedPrompts[idx]?.content
      ) ||
      selectedModel != modelVersionData?.model ||
      modelVersionData?.parsing_type != parser ||
      (modelVersionData?.parsing_type != null &&
        modelVersionData?.output_keys != outputKeys) ||
      (modelVersionData?.functions != selectedFunctions &&
        (modelVersionData?.functions.length != 0 ||
          selectedFunctions.length != 0))
    );
  }, [
    selectedModel,
    originalPrompts,
    modifiedPrompts,
    parser,
    outputKeys,
    selectedFunctions,
    hasRun,
  ]);

  useHotkeys(
    "esc",
    () => {
      if (createVariantOpen) {
        setCreateVariantOpen(false);
      } else if (selectedVersionUuid) {
        setSelectedVersionUuid(null);
      }
    },
    {
      enableOnFormTags: true,
      preventDefault: true,
    }
  );

  // Subscribe to dev branch sync status
  useEffect(() => {
    setSelectedVersionUuid(null);
    if (devBranchData?.cloud) return;
    let devBranchStream;
    createSupabaseClient().then((client) => {
      devBranchStream = subscribeDevBranchStatus(
        client,
        params?.projectUuid as string,
        params?.devName as string,
        async (data) => {
          if (data?.sync == false) {
            const toastId = toast.loading("Syncing...");
            await refetchVersionListData();
            await refetchSampleList();
            await refetchFunctionListData();
            toast.dismiss(toastId);
          }
        }
      );
    });
    return () => {
      devBranchStream?.unsubscribe();
      createSupabaseClient().then((client) => {
        client.removeChannel(devBranchStream);
      });
    };
  }, []);

  // Build nodes
  useEffect(() => {
    if (!versionListData || versionListData.length === 0) return;
    const generatedEdges = [];

    // Before passing your data to stratify, preprocess it:
    const dataWithSyntheticRoot = [
      {
        uuid: "synthetic-root",
        from_uuid: null,
      },
      ...versionListData.map((item) => {
        if (!item.from_uuid && !item.dev_from_uuid) {
          return {
            ...item,
            from_uuid: "synthetic-root",
          };
        } else if (item.dev_from_uuid) {
          return {
            ...item,
            from_uuid: item.dev_from_uuid,
          };
        }
        return item;
      }),
    ];

    // Then, use this preprocessed data with stratify
    const root = stratify()
      .id((d: any) => d.uuid)
      .parentId((d: any) => d.from_uuid)(dataWithSyntheticRoot);

    // Calculate the maximum number of nodes at any depth.
    const maxNodesAtDepth = Math.max(
      ...root.descendants().map((d: any) => d.depth)
    );
    const requiredWidth = maxNodesAtDepth * 320;

    // Use the smaller of window width and required width.
    const layoutWidth = Math.min(window.innerWidth, requiredWidth);
    const layout = tree().size([layoutWidth, root.height * 160]);

    const nodes = layout(root).descendants();

    const generatedNodes = nodes
      .filter((node: any) => node.data.uuid !== "synthetic-root")
      .map((node: any) => {
        const item = node.data;

        let status;
        if (item.is_published) {
          status = "published";
        } else if (item.is_deployed) {
          status = "deployed";
        } else {
          status = item.status;
        }
        if (item.from_uuid !== "synthetic-root") {
          if (item.from_uuid) {
            generatedEdges.push({
              id: `e${item.uuid}-${item.from_uuid}`,
              source: item.from_uuid,
              target: item.uuid,
            });
          }
        }

        return {
          id: item.uuid,
          type: "modelVersion",
          data: {
            label: item.version ?? item.uuid.slice(0, 3),
            uuid: item.uuid,
            status: status,
          },
          position: { x: node.x, y: node.depth * 150 },
        };
      });

    setNodes(generatedNodes);
    setEdges(generatedEdges);
  }, [versionListData]);

  function handleClickCreateVariant() {
    setCreateVariantOpen(true);
  }

  // Run LLM call
  async function handleClickRun(isNew: boolean) {
    const toastId = toast.loading("Running...");
    let prompts: Prompt[];
    let newVersionUuid: string;

    if (isNew) {
      prompts = modifiedPrompts;
    } else {
      prompts = promptListData;
    }

    let cacheRawOutput = "";
    const cacheParsedOutputs = {};
    let cacheFunctionCallData = {};

    const uuid = uuidv4();
    const args: any = {
      projectUuid: params?.projectUuid as string,
      devName: params?.devName as string,
      promptModelUuid: params?.promptModelUuid as string,
      promptModelName: promptModelListData?.find(
        (promptModel) => promptModel.uuid === params?.promptModelUuid
      ).name,
      sampleName: selectedSample == EMPTY_INPUTS_LABEL ? null : selectedSample,
      prompts: prompts,
      model: isNew ? selectedModel : modelVersionData.model,
      fromUuid: isNew ? modelVersionData?.uuid ?? null : null,
      uuid: isNew ? null : modelVersionData?.uuid,
      parsingType: isNew ? parser : modelVersionData?.parsing_type,
      outputKeys: isNew ? outputKeys : modelVersionData?.output_keys,
      functions: isNew ? selectedFunctions : modelVersionData?.functions,
      onNewData: async (data) => {
        switch (data?.status) {
          case "completed":
            await refetchRunLogData();
            removeRunLog(isNew ? "new" : modelVersionData?.uuid, uuid);
            toast.update(toastId, {
              render: "Completed",
              type: "success",
              autoClose: 2000,
              isLoading: false,
            });
            break;
          case "failed":
            await refetchRunLogData();
            removeRunLog(isNew ? "new" : modelVersionData?.uuid, uuid);
            toast.update(toastId, {
              render: data?.log,
              type: "error",
              autoClose: 4000,
              isLoading: false,
            });
            break;
        }
        if (data?.prompt_model_version_uuid) {
          setNewVersionUuidCache(data?.prompt_model_version_uuid);
        }
        if (data?.inputs) {
          updateRunLogs(isNew ? "new" : modelVersionData?.uuid, uuid, {
            inputs: data?.inputs,
          });
        }
        if (data?.raw_output) {
          cacheRawOutput += data?.raw_output;
          updateRunLogs(isNew ? "new" : modelVersionData?.uuid, uuid, {
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
          updateRunLogs(isNew ? "new" : modelVersionData?.uuid, uuid, {
            parsed_outputs: cacheParsedOutputs,
          });
        }
        if (data?.function_call) {
          cacheFunctionCallData = data?.function_call;
          // functionCallData["initial_raw_output"] = cacheRawOutput;
          updateRunLogs(isNew ? "new" : modelVersionData?.uuid, uuid, {
            // raw_output: "",
            function_call: cacheFunctionCallData,
          });
          // cacheRawOutput = "";
        }
        if (data?.function_response) {
          cacheFunctionCallData["response"] = data?.function_response;
          updateRunLogs(isNew ? "new" : modelVersionData?.uuid, uuid, {
            function_call: cacheFunctionCallData,
          });
        }
      },
    };

    if (devBranchData?.cloud) {
      delete args.projectUuid;
      delete args.devName;
      args["devUuid"] = devBranchData?.uuid;
      await streamPromptModelRun(args);
    } else {
      await streamLocalPromptModelRun(args);
    }
    if (isNew) {
      refetchVersionListData();
      if (!modelVersionData?.uuid) {
        setSelectedVersionUuid(newVersionUuidCache);
      }
    }
  }

  async function handleUpdateVersionStatus(
    status: "broken" | "working" | "candidate"
  ) {
    if (devBranchData?.cloud) {
      await updatePromptModelVersionStatus(
        await createSupabaseClient(),
        devBranchData?.uuid,
        modelVersionData?.uuid,
        status
      );
    } else {
      await updateLocalVersionStatus(
        params?.projectUuid as string,
        params?.devName as string,
        modelVersionData?.uuid,
        status
      );
    }
    updateVersionLists(
      params?.promptModelUuid as string,
      versionListData?.map((version) => {
        if (version.uuid === modelVersionData?.uuid) {
          return {
            ...version,
            status: status,
          };
        } else {
          return version;
        }
      })
    );
  }

  return (
    <div className="w-full h-full">
      <ReactFlow
        fitView
        nodeTypes={nodeTypes}
        nodes={nodes}
        edges={edges}
        proOptions={{ hideAttribution: true }}
        onPaneClick={() => {
          setSelectedVersionUuid(null);
        }}
      >
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
      </ReactFlow>
      {/* Input for initial version (when versionListData is empty) */}
      <Drawer
        open={versionListData?.length == 0}
        // open={versionListData?.length == 0}
        direction="right"
        classNames="!w-[100vw] px-4 flex flex-col justify-start items-center pb-4"
        duration={200}
      >
        <div className="flex flex-col justify-start w-full max-w-4xl h-full">
          <div className="flex flex-row justify-between items-center mb-2">
            <p className="text-2xl font-bold">Prompt V1</p>
            <div className="flex flex-row w-fit justify-end items-center gap-x-2">
              <SampleSelector
                sampleName={selectedSample}
                setSample={setSelectedSample}
              />
              <ModelSelector
                modelName={selectedModel}
                setModel={setSelectedModel}
              />
              <button
                className="flex flex-row gap-x-2 items-center btn btn-outline btn-sm normal-case font-normal h-10 border-base-content hover:bg-base-content/20 disabled:bg-muted disabled:border-muted-content"
                onClick={() => handleClickRun(true)}
                disabled={
                  !(modifiedPrompts?.length > 0) ||
                  modifiedPrompts?.every((prompt) => prompt.content === "") ||
                  !selectedSample
                }
              >
                <p className="text-base-content">Run</p>
                <Play className="text-base-content" size={20} weight="fill" />
              </button>
            </div>
          </div>
          <div className="bg-base-200 flex-grow w-full p-4 rounded-t-box overflow-auto">
            <div className="flex flex-row justify-between gap-x-2 items-start mb-2">
              <div className="flex flex-wrap justify-start gap-4 items-start">
                <div className="flex flex-col items-start justify-start">
                  <label className="label text-xs font-medium">
                    <span className="label-text">Output parser type</span>
                  </label>
                  <ParserTypeSelector
                    parser={parser}
                    selectParser={selectParser}
                  />
                </div>
                <div className="flex flex-col items-start justify-start">
                  <label className="label text-xs font-medium">
                    <span className="label-text">Output keys</span>
                  </label>
                  {parser && (
                    <div className="w-full bg-base-content/10 rounded-lg text-sm">
                      <TagsInput
                        value={outputKeys}
                        name="Output Keys"
                        classNames={{
                          input:
                            "text-sm m-0 flex-grow bg-transparent disabled",
                          tag: "!bg-secondary text-secondary-content text-sm",
                        }}
                        placeHolder="Type and press enter"
                        onChange={setOutputKeys}
                      />
                    </div>
                  )}
                  {(parser == null || parser == undefined) && (
                    <Badge className="text-sm" variant="muted">
                      No output keys
                    </Badge>
                  )}
                </div>
                <div className="flex flex-col items-start justify-start">
                  <label className="label text-xs font-medium">
                    <span className="label-text">Functions</span>
                  </label>
                  <FunctionSelector
                    selectedFunctions={selectedFunctions}
                    setSelectedFunctions={setSelectedFunctions}
                  />
                </div>
              </div>
              <div
                className="flex flex-row justify-end items-center tooltip tooltip-left tooltip-info"
                data-tip="Press Cmd + / to insert output format to your prompt"
              >
                <kbd className="kbd text-base-content">
                  <Command size={16} />
                </kbd>
                <kbd className="kbd text-base-content">/</kbd>
              </div>
            </div>
            <div className="divider" />
            <div className="flex flex-col h-full gap-y-2 justify-start items-center">
              {modifiedPrompts?.map((prompt) => (
                <PromptComponent
                  prompt={prompt}
                  setPrompts={setModifiedPrompts}
                />
              ))}
              <NewPromptButton
                prompts={modifiedPrompts}
                setPrompts={setModifiedPrompts}
              />
            </div>
          </div>
          <div className="relative">
            <ResizableSeparator
              height={lowerBoxHeight}
              setHeight={setLowerBoxHeight}
            />
            <div
              className="mt-4 backdrop-blur-sm"
              style={{ height: lowerBoxHeight }}
            >
              <RunLogSection versionUuid="new" />
            </div>
          </div>
        </div>
      </Drawer>
      <SlashCommandOptions
        open={Boolean(showSlashOptions)}
        setOpen={setShowSlashOptions}
        parsingType={parser}
        onInsert={(outputFormatText: string, outputKey: string) => {
          const position = focusedEditor.getPosition();
          focusedEditor?.executeEdits("", [
            {
              range: {
                startLineNumber: position.lineNumber,
                startColumn: position.column,
                endLineNumber: position.lineNumber,
                endColumn: position.column,
              },
              text: outputFormatText, // The value you want to insert
            },
          ]);
          setShowSlashOptions(false);
          // Add output key
          setOutputKeys([...outputKeys, outputKey]);
          // Calculate new cursor position
          const newColumnPosition = position.column + outputFormatText.length;
          // Set cursor to the end of the inserted value
          focusedEditor.setPosition({
            lineNumber: position.lineNumber,
            column: newColumnPosition,
          });
          // Focus the editor
          focusedEditor.focus();
        }}
      />
      <Drawer
        open={selectedVersionUuid != null}
        direction="right"
        style={{ width: createVariantOpen ? "calc(100vw - 5rem)" : "auto" }}
        classNames={classNames(
          createVariantOpen ? "backdrop-blur-md" : "!w-[45vw]",
          "mr-4"
        )}
      >
        {selectedVersionUuid && (
          <div className="w-full h-full bg-transparent flex flex-row justify-end items-start">
            <div
              className={classNames(
                "w-full h-full bg-transparent p-4 flex flex-col justify-start",
                createVariantOpen && "pr-0 ps-12"
              )}
            >
              {/* Header */}
              <div className="flex flex-row justify-between items-center gap-x-8">
                <div className="flex flex-row w-full justify-between items-center gap-x-3 mb-2 mr-2">
                  {modelVersionData?.is_deployed ? (
                    <div className="flex flex-row justify-start items-center gap-x-3">
                      <p className="text-base-content font-bold text-lg">
                        Prompt V{modelVersionData?.version}
                      </p>

                      {modelVersionData?.is_published ? (
                        <div className="flex flex-row gap-x-2 items-center">
                          <StatusIndicator status="published" />
                          <p className="text-base-content font-medium text-sm">
                            Published
                          </p>
                        </div>
                      ) : (
                        <div className="flex flex-row gap-x-2 items-center">
                          <StatusIndicator status="deployed" />
                          <p className="text-base-content font-medium text-sm">
                            Deployed
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-row justify-start items-center gap-x-3">
                      <p className="text-base-content font-bold text-lg">
                        Prompt V{modelVersionData?.uuid.slice(0, 6)}
                      </p>
                      <div className="flex flex-row gap-x-2 items-center">
                        <StatusSelector
                          status={modelVersionData?.status}
                          setStatus={handleUpdateVersionStatus}
                        />
                      </div>
                    </div>
                  )}
                  {createVariantOpen ? (
                    <div className="flex flex-row gap-x-3">
                      <ModelDisplay modelName={modelVersionData?.model} />
                      <button
                        className="flex flex-row gap-x-2 items-center btn btn-outline btn-sm normal-case font-normal h-10 border-base-content hover:bg-base-content/20 disabled:bg-muted disabled:border-muted-content"
                        onClick={() => handleClickRun(false)}
                      >
                        <p className="text-base-content">Run</p>
                        <Play
                          className="text-base-content"
                          size={20}
                          weight="fill"
                        />
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-row gap-x-3">
                      <ModelDisplay modelName={modelVersionData?.model} />
                      <button
                        className="flex flex-row gap-x-2 items-center btn btn-sm normal-case font-normal h-10 border-[1px] border-neutral-content hover:bg-neutral-content/20"
                        onClick={handleClickCreateVariant}
                      >
                        <GitBranch
                          className="text-secondary"
                          size={20}
                          weight="fill"
                        />
                        <p className="text-base-content">Create Variant</p>
                      </button>
                      <button
                        className="flex flex-col gap-y-2 pt-1 items-center btn btn-sm normal-case font-normal bg-transparent border-transparent h-10 hover:bg-neutral-content/20"
                        onClick={() => {
                          setSelectedVersionUuid(null);
                        }}
                      >
                        <div className="flex flex-col">
                          <XCircle size={22} />
                          <p className="text-base-content text-xs">Esc</p>
                        </div>
                      </button>
                    </div>
                  )}
                </div>
                {createVariantOpen && (
                  <div className="flex flex-row w-full justify-between items-center mb-2">
                    <div className="flex flex-col items-start justify-center">
                      <p className="text-base-content font-medium text-lg">
                        New Prompt
                      </p>
                      <p className="text-base-content text-sm">
                        From&nbsp;
                        <u>
                          Prompt V
                          {modelVersionData?.version ??
                            modelVersionData?.uuid?.slice(0, 6)}
                        </u>
                      </p>
                    </div>
                    <div className="flex flex-row justify-end gap-x-3 items-center">
                      <SampleSelector
                        sampleName={selectedSample}
                        setSample={setSelectedSample}
                      />
                      <ModelSelector
                        modelName={selectedModel}
                        setModel={setSelectedModel}
                      />
                      <button
                        className={classNames(
                          "flex flex-row gap-x-2 items-center btn btn-outline btn-sm normal-case font-normal h-10 bg-base-content hover:bg-base-content/80",
                          "text-base-100 disabled:bg-muted disabled:text-muted-content disabled:border-muted-content"
                        )}
                        onClick={() => {
                          setHasRun(true);
                          handleClickRun(true);
                        }}
                        disabled={!isNewVersionReady}
                      >
                        <p>Run</p>
                        <Play size={20} weight="fill" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
              {/* Prompt editor */}
              <motion.div className="bg-base-200 w-full p-4 rounded-t-box overflow-auto flex-grow">
                {createVariantOpen ? (
                  <div className="flex flex-row justify-between items-start mb-2">
                    <div className="flex flex-col w-1/2 justify-start gap-y-2 items-start mb-2">
                      <div className="flex flex-row justify-start gap-x-4 items-start">
                        <div className="min-w-fit flex flex-col items-start justify-start">
                          <label className="label text-xs font-medium">
                            <span className="label-text">
                              Output parser type
                            </span>
                          </label>
                          <ParserTypeSelector
                            parser={modelVersionData?.parsing_type}
                          />
                        </div>
                        <div className="w-auto flex flex-col items-start justify-start">
                          <label className="label text-xs font-medium">
                            <span className="label-text">Output keys</span>
                          </label>
                          {modelVersionData?.output_keys && (
                            <div className="w-full flex flex-row flex-wrap items-center gap-x-1 gap-y-2">
                              {modelVersionData?.output_keys?.map((key) => (
                                <Badge className="text-sm" variant="secondary">
                                  {key}
                                </Badge>
                              ))}
                            </div>
                          )}
                          {!modelVersionData?.output_keys && (
                            <Badge className="text-sm" variant="muted">
                              No output keys
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="w-auto flex flex-col items-start justify-start">
                        <label className="label text-xs font-medium">
                          <span className="label-text">Functions</span>
                        </label>
                        {modelVersionData?.functions && (
                          <div className="w-full flex flex-row flex-wrap items-center gap-x-1 gap-y-2">
                            {modelVersionData?.functions?.map(
                              (functionName) => (
                                <Badge
                                  key={functionName}
                                  className="text-sm"
                                  variant="default"
                                >
                                  {functionName}
                                </Badge>
                              )
                            )}
                          </div>
                        )}
                        {(!modelVersionData?.functions ||
                          modelVersionData?.functions?.length == 0) && (
                          <Badge className="text-sm" variant="muted">
                            No functions
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col w-1/2 justify-start gap-y-2 items-start mb-2">
                      <div className="flex flex-row justify-start gap-x-4 items-start">
                        <div className="flex flex-col items-start justify-start">
                          <label className="label text-xs font-medium">
                            <span className="label-text">
                              Output parser type
                            </span>
                          </label>
                          <ParserTypeSelector
                            parser={parser}
                            selectParser={selectParser}
                          />
                        </div>
                        <div className="flex flex-col items-start justify-start">
                          <label className="label text-xs font-medium">
                            <span className="label-text">Output keys</span>
                          </label>
                          {parser && (
                            <div className="w-full bg-base-content/10 rounded-lg text-sm">
                              <TagsInput
                                value={outputKeys}
                                name="Output Keys"
                                classNames={{
                                  input:
                                    "text-sm m-0 flex-grow bg-transparent disabled",
                                  tag: "!bg-secondary text-secondary-content text-sm",
                                }}
                                placeHolder="Type and press enter"
                                onChange={setOutputKeys}
                              />
                            </div>
                          )}
                          {(parser == null || parser == undefined) && (
                            <Badge className="text-sm" variant="muted">
                              No output keys
                            </Badge>
                          )}
                        </div>
                        <div
                          className="flex flex-row justify-end items-center tooltip tooltip-left tooltip-info"
                          data-tip="Press Cmd + / to insert output format to your prompt"
                        >
                          <kbd className="kbd text-base-content">
                            <Command size={16} />
                          </kbd>
                          <kbd className="kbd text-base-content">/</kbd>
                        </div>
                      </div>
                      <div className="flex flex-col items-start justify-start">
                        <label className="label text-xs font-medium">
                          <span className="label-text">Functions</span>
                        </label>
                        <FunctionSelector
                          selectedFunctions={selectedFunctions}
                          setSelectedFunctions={setSelectedFunctions}
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap justify-start gap-x-4 items-start mb-6">
                    <div className="min-w-fit flex flex-col items-start justify-start">
                      <label className="label text-xs font-medium">
                        <span className="label-text">Output parser type</span>
                      </label>
                      <ParserTypeSelector
                        parser={modelVersionData?.parsing_type}
                      />
                    </div>
                    <div className="w-auto flex flex-col items-start justify-start">
                      <label className="label text-xs font-medium">
                        <span className="label-text">Output keys</span>
                      </label>
                      {modelVersionData?.output_keys && (
                        <div className="w-full flex flex-row flex-wrap items-center gap-x-1 gap-y-2">
                          {modelVersionData?.output_keys?.map((key) => (
                            <Badge className="text-sm" variant="secondary">
                              {key}
                            </Badge>
                          ))}
                        </div>
                      )}
                      {!modelVersionData?.output_keys && (
                        <Badge className="text-sm" variant="muted">
                          No output keys
                        </Badge>
                      )}
                    </div>
                    <div className="w-auto flex flex-col items-start justify-start">
                      <label className="label text-xs font-medium">
                        <span className="label-text">Functions</span>
                      </label>
                      {modelVersionData?.functions && (
                        <div className="w-full flex flex-row flex-wrap items-center gap-x-1 gap-y-2">
                          {modelVersionData?.functions?.map((functionName) => (
                            <Badge
                              key={functionName}
                              className="text-sm"
                              variant="default"
                            >
                              {functionName}
                            </Badge>
                          ))}
                        </div>
                      )}
                      {(!modelVersionData?.functions ||
                        modelVersionData?.functions?.length == 0) && (
                        <Badge className="text-sm" variant="muted">
                          No functions
                        </Badge>
                      )}
                    </div>
                  </div>
                )}
                <div className="flex flex-col gap-y-2 justify-start items-end">
                  {promptListData?.map((prompt, idx) =>
                    createVariantOpen ? (
                      <PromptDiffComponent
                        prompt={prompt}
                        setPrompts={setModifiedPrompts}
                      />
                    ) : (
                      <PromptComponent prompt={prompt} />
                    )
                  )}
                  {createVariantOpen &&
                    modifiedPrompts
                      ?.slice(promptListData?.length)
                      .map((prompt) => (
                        <div className="w-1/2">
                          <PromptComponent
                            prompt={prompt}
                            setPrompts={setModifiedPrompts}
                          />
                        </div>
                      ))}
                  {createVariantOpen && (
                    <div className="w-1/2 flex justify-center items-center">
                      <NewPromptButton
                        prompts={modifiedPrompts}
                        setPrompts={setModifiedPrompts}
                      />
                    </div>
                  )}
                </div>
              </motion.div>
              <div className="relative backdrop-blur-md h-fit">
                <ResizableSeparator
                  height={lowerBoxHeight}
                  setHeight={setLowerBoxHeight}
                />
                <div
                  className="flex flex-row justify-between items-start mt-4 gap-x-4"
                  style={{ height: lowerBoxHeight }}
                >
                  <RunLogSection
                    versionUuid={selectedVersionUuid}
                    className={classNames(createVariantOpen && "!w-1/2")}
                  />
                  {createVariantOpen && (
                    <RunLogSection versionUuid="new" className="!w-1/2" />
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </Drawer>
      <Drawer
        open={createVariantOpen && selectedVersionUuid != null}
        direction="left"
        classNames="!w-[5rem] pl-2 relative"
      >
        {createVariantOpen && selectedVersionUuid != null && (
          <div className="w-full h-full bg-transparent flex flex-col justify-center items-start gap-y-3">
            <button
              className="absolute top-6 left-2 flex flex-col gap-y-2 pt-1 items-center btn btn-sm normal-case font-normal bg-transparent border-transparent h-10 hover:bg-neutral-content/20"
              onClick={() => {
                setCreateVariantOpen(false);
              }}
            >
              <div className="flex flex-col">
                <XCircle size={22} />
                <p className="text-base-content text-xs">Esc</p>
              </div>
            </button>
            <div className="h-full overflow-auto mt-20">
              {versionListData?.map((versionData) => {
                let status;
                if (versionData.is_published) {
                  status = "published";
                } else if (versionData.version) {
                  status = "deployed";
                } else {
                  status = versionData.status;
                }

                return (
                  <div
                    className={classNames(
                      "flex flex-row items-center gap-x-2 rounded-full p-2 backdrop-blur-sm hover:bg-base-content/10 transition-all cursor-pointer",
                      "active:scale-90",
                      selectedVersionUuid == versionData.uuid
                        ? "bg-base-content/20"
                        : "bg-transparent",
                      newVersionUuidCache == versionData.uuid &&
                        "tooltip tooltip-bottom tooltip-primary"
                    )}
                    data-tip="New!"
                    key={versionData.version ?? versionData.uuid.slice(0, 3)}
                    onClick={() => {
                      setHasRun(false);
                      setNewVersionUuidCache(null);
                      setSelectedVersionUuid(versionData.uuid);
                    }}
                  >
                    <StatusIndicator status={status} />
                    <p className="text-base-content font-semibold text-lg">
                      V{versionData.version ?? versionData.uuid.slice(0, 3)}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}

const NewPromptButton = ({ prompts, setPrompts }) => {
  const buttonRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);

  const isEmpty = !(prompts?.length > 0);

  // Use useEffect to add an event listener to the document
  useEffect(() => {
    function handleOutsideClick(event) {
      if (buttonRef.current && !buttonRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    // Attach the click event listener
    document.addEventListener("mousedown", handleOutsideClick);
    // Clean up the listener when the component is unmounted
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, []);

  return (
    <motion.button
      ref={buttonRef}
      className="relative group"
      onClick={() => {
        setIsOpen(true);
      }}
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      <PlusSquare
        size={36}
        weight="fill"
        className="text-base-content hover:text-base-content/80 hover:scale-110 active:scale-95 transition-all m-1"
      />
      {isOpen && (
        <motion.div
          initial={{
            opacity: 0,
            width: 0,
            bottom: !isEmpty ? -10 : "auto",
            top: isEmpty ? -5 : "auto",
            left: 0,
          }}
          animate={{
            opacity: isOpen ? 1 : 0,
            width: isOpen ? "auto" : 0,
            left: "100%",
            bottom: !isEmpty ? 0 : "auto",
            top: isEmpty ? 5 : "auto",
          }}
          className={classNames(
            `absolute z-[99999]`,
            "w-fit bg-base-content/10 backdrop-blur-sm rounded-lg",
            "shadow-md shadow-base-content/10",
            "btn-group btn-group-vertical"
          )}
        >
          {["system", "user", "assistant"].map((role: string) => (
            <button
              className="text-sm text-start hover:bg-base-content hover:text-base-100 rounded-lg px-3 py-2"
              onClick={() =>
                setPrompts((prevPrompts) => {
                  const newPrompts = [...prevPrompts];
                  newPrompts.push({
                    role: role,
                    step: newPrompts.length + 1,
                    content: "",
                  });
                  return newPrompts;
                })
              }
            >
              {role.charAt(0).toUpperCase() + role.slice(1)}
            </button>
          ))}
        </motion.div>
      )}
    </motion.button>
  );
};

const PromptComponent = ({
  prompt,
  setPrompts,
}: {
  prompt: Prompt;
  setPrompts?: (prompts) => void;
}) => {
  const [open, setOpen] = useState(true);
  const [height, setHeight] = useState(30);
  const editorRef = useRef(null);
  const { setFocusedEditor, setShowSlashOptions } =
    usePromptModelVersionStore();

  const handleEditorDidMount = (editor: editor.IStandaloneCodeEditor) => {
    const contentHeight = editor.getContentHeight();
    editorRef.current = editor;
    console.log(editor.getModel()?.getLanguageId());

    if (contentHeight) {
      setHeight(contentHeight);
    }

    editor.onKeyDown((e) => {
      if (e.code === "Slash" && (e.ctrlKey || e.metaKey)) {
        setShowSlashOptions(true);
      }
    });
    editor.onDidFocusEditorWidget(() => {
      setFocusedEditor(editorRef.current);
    });
  };

  useEffect(() => {
    const contentHeight = editorRef.current?.getContentHeight();
    const maxHeight = window.innerHeight * 0.7;
    if (contentHeight) {
      setHeight(Math.min(contentHeight, maxHeight));
    }
  }, [editorRef.current?.getContentHeight()]);

  return (
    <motion.div
      key={prompt.step}
      className="w-full h-full flex flex-col justify-start items-center bg-base-100 rounded-box"
      animate={{ height: open ? "auto" : "2.5rem" }}
    >
      <div
        className={classNames(
          "w-full h-10 min-h-[2.5rem] flex flex-row justify-between items-center py-1 px-3 cursor-pointer"
        )}
        onClick={() => setOpen(!open)}
      >
        <p className="text-base-content font-medium">
          #{prompt.step}. {prompt.role}
        </p>
        <div className="flex flex-row gap-x-1 items-center">
          <button
            className="p-2 group"
            onClick={() => {
              setPrompts((prevPrompts) => {
                const newPrompts = prevPrompts.filter(
                  (p) => p.step !== prompt.step
                );
                return newPrompts?.map((p, index) => ({
                  ...p,
                  step: index + 1,
                }));
              });
            }}
          >
            <Trash
              size={24}
              className="text-base-content transition-all group-hover:text-red-400 hover:font-bold"
            />
          </button>
          <CaretDown
            size={24}
            className={classNames(
              "text-base-content transition-transform shrink-0",
              open && "transform rotate-180"
            )}
          />
        </div>
      </div>
      {open && (
        <PromptEditor
          value={prompt.content}
          onChange={(value) => {
            if (setPrompts) {
              setPrompts((prevPrompts) => {
                const newPrompts = [...prevPrompts];
                if (newPrompts.length < prompt.step) {
                  newPrompts.push({
                    role: prompt.role,
                    step: prompt.step,
                    content: value,
                  });
                } else {
                  newPrompts[prompt.step - 1].content = value;
                }
                return newPrompts;
              });
            }
          }}
          options={{
            readOnly: setPrompts == undefined,
          }}
          loading={<div className="loading loading-xs loading-dots" />}
          onMount={handleEditorDidMount}
          height={height}
        />
      )}
    </motion.div>
  );
};

const PromptDiffComponent = ({ prompt, setPrompts }) => {
  const [open, setOpen] = useState(true);
  const [height, setHeight] = useState(30);
  const originalEditorRef = useRef(null);
  const modifiedEditorRef = useRef(null);
  const { setFocusedEditor, setShowSlashOptions } =
    usePromptModelVersionStore();

  const handleEditorDidMount = (editor: MonacoDiffEditor, monaco: Monaco) => {
    originalEditorRef.current = editor.getOriginalEditor();
    modifiedEditorRef.current = editor.getModifiedEditor();
    const originalHeight = originalEditorRef.current?.getContentHeight();
    const maxHeight = window.innerHeight * 0.7;
    if (originalHeight) {
      setHeight(Math.min(originalHeight, maxHeight));
    }
    modifiedEditorRef.current?.onKeyDown((e) => {
      if (e.code === "Slash" && (e.ctrlKey || e.metaKey)) {
        setShowSlashOptions(true);
      }
    });
    modifiedEditorRef.current?.onDidFocusEditorWidget(() => {
      setFocusedEditor(modifiedEditorRef.current);
    });

    modifiedEditorRef.current.onDidChangeModelContent(() => {
      setPrompts((prevPrompts) => {
        const newPrompts = [...prevPrompts];
        if (newPrompts.length < prompt.step) {
          newPrompts.push({
            role: prompt.role,
            step: prompt.step,
            content: modifiedEditorRef.current?.getValue(),
          });
        } else {
          newPrompts[prompt.step - 1].content =
            modifiedEditorRef.current?.getValue();
        }
        return newPrompts;
      });
    });
  };

  useEffect(() => {
    const originalHeight = originalEditorRef.current?.getContentHeight();
    const modifiedHeight = modifiedEditorRef.current?.getContentHeight();
    const maxHeight = window.innerHeight * 0.7;
    if (modifiedHeight > originalHeight) {
      setHeight(Math.min(modifiedHeight, maxHeight));
    } else {
      setHeight(Math.min(originalHeight, maxHeight));
    }
  }, [originalEditorRef.current, modifiedEditorRef.current]);

  return (
    <motion.div
      key={prompt.step}
      className="w-full h-full flex flex-col justify-start items-center bg-base-100 rounded-box"
      animate={{ height: open ? "auto" : "2.5rem" }}
    >
      <div
        className={classNames(
          "w-full h-10 min-h-[2.5rem] flex flex-row justify-between items-center py-1 px-3 cursor-pointer"
        )}
        onClick={() => setOpen(!open)}
      >
        <p className="text-base-content font-semibold">
          #{prompt.step}. {prompt.role}
        </p>
        <CaretDown
          className={classNames(
            "text-base-content transition-transform",
            open && "transform rotate-180"
          )}
        />
      </div>
      {open && (
        <PromptDiffEditor
          className="gap-x-8"
          original={prompt.content}
          modified={prompt.content}
          loading={<div className="loading loading-xs loading-dots" />}
          onMount={handleEditorDidMount}
          height={height}
        />
      )}
    </motion.div>
  );
};

const RunLogSection = ({
  versionUuid,
  className,
}: {
  versionUuid: string | "new";
  className?: string;
}) => {
  // const [showRaw, setShowRaw] = useState(true);
  const { runLogData } = useRunLogs(versionUuid);
  const { runTasksCount, runLogs } = usePromptModelVersionStore();
  const [runLogList, setRunLogList] = useState<RunLog[]>([]);
  const [isFullScreen, setIsFullScreen] = useState(false);

  useEffect(() => {
    if (runTasksCount == null || runLogData == undefined || runLogData == null)
      return;

    let updatedRunLogList = [];

    if (runLogData?.length > 0) {
      updatedRunLogList = [
        ...runLogData.map((log) => {
          let parsedInputs, parsedOutputs;
          try {
            parsedInputs = JSON.parse(log.inputs);
          } catch (e) {
            parsedInputs = log.inputs;
          }
          try {
            parsedOutputs = JSON.parse(log.parsed_outputs);
          } catch (e) {
            parsedOutputs = log.parsed_outputs;
          }
          return {
            inputs: parsedInputs,
            raw_output: log.raw_output,
            parsed_outputs: parsedOutputs,
            function_call: log.function_call,
          };
        }),
      ];
    }
    if (runLogs[versionUuid]) {
      updatedRunLogList.unshift(...Object.values(runLogs[versionUuid]));
    }

    setRunLogList(updatedRunLogList);
  }, [runLogData, runLogs[versionUuid]]);

  return (
    <div
      className={classNames(
        "w-full h-full rounded-box items-center bg-base-200 p-4 flex flex-col gap-y-2 justify-start",
        className
      )}
    >
      <div className="w-full h-full flex flex-col gap-y-2 bg-base-200 rounded overflow-auto">
        <div className="w-full flex flex-row justify-between align-middle">
          <div className="text-xl font-semibold ps-2">Run Log</div>
          <button
            className="btn btn-sm bg-transparent border-transparent items-center hover:bg-neutral-content/20"
            onClick={() => {
              setIsFullScreen(!isFullScreen);
            }}
          >
            <CornersOut size={22} />
          </button>
        </div>
        {isFullScreen && (
          <ModalPortal>
            <motion.div
              className="w-screen h-screen fixed z-[999999] bg-base-100 p-4 flex flex-col gap-y-4 rounded"
              initial={{ bottom: 4, right: 4 }}
              animate={{ top: 4, left: 4, bottom: 4, right: 4 }}
            >
              <div className="w-full flex flex-row justify-between align-middle">
                <div className="text-3xl font-semibold ps-2">Run Log</div>
                <button
                  className="btn btn-sm bg-transparent border-transparent items-center hover:bg-neutral-content/20 py-2 h-fit"
                  onClick={() => {
                    setIsFullScreen(!isFullScreen);
                  }}
                >
                  <CornersOut size={30} />
                </button>
              </div>
              <RunLogTable runLogList={runLogList} />
            </motion.div>
          </ModalPortal>
        )}
        <RunLogTable runLogList={runLogList} />
      </div>
    </div>
  );
};

const RunLogTable = ({ runLogList }) => {
  const [showRaw, setShowRaw] = useState(true);

  return (
    <div className="overflow-auto">
      <table className="w-full table table-pin-cols">
        <thead className="sticky top-0 z-10 bg-base-100 w-full">
          <tr className="text-base-content">
            <th className="w-fit">
              <p className="text-lg font-medium ps-1">Input</p>
            </th>
            <th className="flex flex-row gap-x-6 items-center">
              <p className="text-lg font-medium ps-1">Output</p>
              <div className="join">
                <button
                  className={classNames(
                    "btn join-item btn-xs font-medium h-fit hover:bg-base-300/70 text-xs",
                    showRaw && "bg-base-300",
                    !showRaw && "bg-base-300/40"
                  )}
                  onClick={() => setShowRaw(true)}
                >
                  Raw
                </button>
                <button
                  className={classNames(
                    "btn join-item btn-xs font-medium h-fit hover:bg-base-300/70 text-xs",
                    !showRaw && "bg-base-300",
                    showRaw && "bg-base-300/40"
                  )}
                  onClick={() => setShowRaw(false)}
                >
                  Parsed
                </button>
              </div>
            </th>
            <th>
              <p className="text-lg font-medium ps-1">Function call</p>
            </th>
          </tr>
        </thead>
        <tbody className="bg-base-100">
          {runLogList?.map((log) => (
            <RunLogComponent showRaw={showRaw} runLogData={log} />
          ))}
        </tbody>
      </table>
    </div>
  );
};

const RunLogComponent = ({
  showRaw,
  runLogData,
}: {
  showRaw: boolean;
  runLogData?: RunLog;
}) => {
  return (
    <tr className="align-top">
      <td className="align-top w-fit">
        {runLogData?.inputs == null ? (
          <p>None</p>
        ) : typeof runLogData?.inputs == "string" ? (
          <p>{runLogData?.inputs?.toString()}</p>
        ) : (
          <ReactJson
            src={runLogData?.inputs as Record<string, any>}
            name={false}
            displayDataTypes={false}
            displayObjectSize={false}
            enableClipboard={false}
            theme="google"
          />
        )}
      </td>
      <td className="align-top w-fit">
        {showRaw ? (
          <p className="whitespace-break-spaces">{runLogData?.raw_output}</p>
        ) : typeof runLogData?.parsed_outputs == "string" ||
          runLogData?.parsed_outputs == null ? (
          <p>{runLogData?.parsed_outputs?.toString()}</p>
        ) : (
          <ReactJson
            src={runLogData?.parsed_outputs as Record<string, any>}
            name={false}
            displayDataTypes={false}
            displayObjectSize={false}
            enableClipboard={false}
            theme="google"
          />
        )}
      </td>
      <td className="align-top w-fit">
        {runLogData?.function_call == null ? (
          <p>None</p>
        ) : typeof runLogData?.function_call == "string" ? (
          <p>{runLogData?.function_call?.toString()}</p>
        ) : (
          <ReactJson
            src={runLogData?.function_call as Record<string, any>}
            name={false}
            displayDataTypes={false}
            displayObjectSize={false}
            enableClipboard={false}
            theme="google"
          />
        )}
      </td>
    </tr>
  );
};

function ModelVersionNode({ data }) {
  const {
    selectedPromptModelVersionUuid: selectedVersionUuid,
    setSelectedPromptModelVersionUuid: setSelectedVersionUuid,
  } = usePromptModelVersionStore();
  return (
    <div
      className={classNames(
        "p-2 rounded-full flex justify-center items-center",
        "w-20 h-20 visible cursor-pointer",
        "transition-all",
        selectedVersionUuid == data.uuid
          ? "border-neutral-content border-2"
          : "border-none",
        data.status == "published" && "bg-secondary/80 hover:bg-secondary/50",
        data.status == "deployed" && "bg-blue-500/60 hover:bg-blue-500/30",
        data.status != "published" && data.status != "deployed" && "bg-base-200"
      )}
      onClick={() => setSelectedVersionUuid(data.uuid)}
    >
      <Handle type="target" position={Position.Top} />
      <div className="flex flex-col justify-center items-center gap-y-1">
        {data.status != "published" && data.status != "deployed" && (
          <StatusIndicator status={data.status} />
        )}
        <p className="text-base-content font-medium flex-shrink-0">
          V <span className="font-bold text-xl">{data.label}</span>
        </p>
      </div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}
