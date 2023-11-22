"use client";

import { hierarchy, tree, stratify } from "d3-hierarchy";
import { Drawer } from "@/components/Drawer";
import classNames from "classnames";
import { useEffect, useMemo, useRef, useState } from "react";
import ReactFlow, {
  Background,
  BackgroundVariant,
  Handle,
  Position,
} from "reactflow";
import { motion } from "framer-motion";
import { ArrowUp, CornersOut, GitBranch, XCircle } from "@phosphor-icons/react";
import { Monaco, MonacoDiffEditor } from "@monaco-editor/react";
import { editor } from "monaco-editor/esm/vs/editor/editor.api";

import "reactflow/dist/style.css";
import { useHotkeys } from "react-hotkeys-hook";
import { subscribeDevBranchStatus } from "@/apis/dev";
import { useParams } from "next/navigation";
import { StatusIndicator } from "@/components/StatusIndicator";
import { useSupabaseClient } from "@/apis/base";
import { toast } from "react-toastify";
import { ModelDisplay, ModelSelector } from "@/components/ModelSelector";
import { firstLetterToUppercase } from "@/utils";
import { StatusSelector } from "@/components/select/StatusSelector";
import { ResizableSeparator } from "@/components/ResizableSeparator";
import { Badge } from "@/components/ui/badge";
import {
  PromptDiffEditor,
  PromptEditor,
} from "@/components/editor/PromptEditor";
import { FunctionSelector } from "@/components/select/FunctionSelector";
import { useFunctions } from "@/hooks/dev/useFunctions";
import { useDevBranch } from "@/hooks/useDevBranch";
import { updateChatModelVersionStatus } from "@/apis/devCloud";
import { ModalPortal } from "@/components/ModalPortal";
import { useChatModelVersion } from "@/hooks/dev/useChatModelVersion";
import { useChatModel } from "@/hooks/dev/useChatModel";
import { useChatModelVersionStore } from "@/stores/chatModelVersionStore";
import { useChatLogSessions } from "@/hooks/dev/useChatLogSession";
import { ChatSessionSelector } from "@/components/select/ChatSessionSelector";
import { useSessionChatLogs } from "@/hooks/dev/useSessionChatLogs";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { ChatUI } from "@/components/ChatUI";
import {
  useWindowHeight,
  useWindowSize,
  useWindowWidth,
} from "@react-hook/window-size";
dayjs.extend(relativeTime);

export default function Page() {
  const params = useParams();
  const [windowWidth, windowHeight] = useWindowSize();
  const { createSupabaseClient } = useSupabaseClient();
  const { chatModelListData } = useChatModel();
  const { chatModelVersionListData, refetchChatModelVersionListData } =
    useChatModelVersion();
  const { devBranchData } = useDevBranch();

  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [createVariantOpen, setCreateVariantOpen] = useState(false);
  // Local dev environment

  const {
    selectedChatModelVersionUuid,
    originalVersionData,
    modifiedSystemPrompt,
    selectedModel,
    selectedFunctions,
    fullScreenChatVersion,
    newVersionCache,
    setSelectedModel,
    setSelectedFunctions,
    setOriginalVersionData,
    setModifiedSystemPrompt,
    updateChatModelVersionLists,
    setSelectedChatModelVersionUuid,
    setFullScreenChatVersion,
    setNewVersionCache,
  } = useChatModelVersionStore();

  const { refetchFunctionListData } = useFunctions();

  const [lowerBoxHeight, setLowerBoxHeight] = useState(windowHeight * 0.6);

  const nodeTypes = useMemo(() => ({ modelVersion: ModelVersionNode }), []);

  useEffect(() => {
    if (originalVersionData?.uuid === selectedChatModelVersionUuid) return;
    const data = chatModelVersionListData?.find(
      (version) => version.uuid === selectedChatModelVersionUuid
    );
    if (data?.model) {
      setSelectedModel(data?.model);
    }
    setOriginalVersionData(data);
  }, [selectedChatModelVersionUuid, chatModelVersionListData]);

  useEffect(() => {
    setSelectedChatModelVersionUuid(null);
  }, []);

  useEffect(() => {
    if (originalVersionData) {
      setModifiedSystemPrompt(originalVersionData.system_prompt);
    } else {
      setModifiedSystemPrompt("");
    }
  }, [selectedChatModelVersionUuid, originalVersionData]);

  const isNewVersionReady = useMemo(() => {
    if (!createVariantOpen) return false;
    if (
      originalVersionData?.system_prompt == modifiedSystemPrompt &&
      originalVersionData?.model == selectedModel &&
      originalVersionData?.functions == selectedFunctions
    )
      return false;

    if (newVersionCache) {
      if (
        newVersionCache?.systemPrompt == modifiedSystemPrompt &&
        newVersionCache?.model == selectedModel
      )
        return false;
    }
    return true;
  }, [
    originalVersionData,
    newVersionCache,
    selectedModel,
    modifiedSystemPrompt,
    selectedFunctions,
  ]);

  useHotkeys(
    "esc",
    () => {
      if (fullScreenChatVersion) {
        setFullScreenChatVersion(null);
      } else if (createVariantOpen) {
        setCreateVariantOpen(false);
      } else if (selectedChatModelVersionUuid) {
        setSelectedChatModelVersionUuid(null);
      }
    },
    {
      enableOnFormTags: true,
      preventDefault: true,
    }
  );

  // Subscribe to dev branch sync status
  useEffect(() => {
    setSelectedChatModelVersionUuid(null);
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
            await refetchChatModelVersionListData();
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
    if (!chatModelVersionListData || chatModelVersionListData.length === 0)
      return;
    const generatedEdges = [];

    // Before passing your data to stratify, preprocess it:
    const dataWithSyntheticRoot = [
      {
        uuid: "synthetic-root",
        from_uuid: null,
      },
      ...chatModelVersionListData.map((item) => {
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
    const requiredWidth = maxNodesAtDepth * 140;

    // Use the smaller of window width and required width.
    const layoutWidth = Math.min(windowWidth, requiredWidth);
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
  }, [chatModelVersionListData]);

  function handleClickCreateVariant() {
    setCreateVariantOpen(true);
  }

  async function handleUpdateVersionStatus(
    status: "broken" | "working" | "candidate"
  ) {
    if (devBranchData?.cloud) {
      await updateChatModelVersionStatus(
        await createSupabaseClient(),
        devBranchData?.uuid,
        originalVersionData?.uuid,
        status
      );
    } else {
      // TODO: Update local ChatModel version status
      // await updateLocalVersionStatus(
      //   params?.projectUuid as string,
      //   params?.devName as string,
      //   originalVersionData?.uuid,
      //   status
      // );
    }
    updateChatModelVersionLists(
      params?.chatModelUuid as string,
      chatModelVersionListData?.map((version) => {
        if (version.uuid === originalVersionData?.uuid) {
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
          setSelectedChatModelVersionUuid(null);
        }}
      >
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
      </ReactFlow>
      {/* Input for initial version (when versionListData is empty) */}
      <Drawer
        open={chatModelVersionListData?.length == 0}
        // open={versionListData?.length == 0}
        direction="right"
        classNames="!w-[100vw] px-4 flex flex-col justify-start items-center pb-4"
        duration={200}
      >
        <div className="flex flex-col justify-start w-full max-w-4xl h-full">
          <div className="flex flex-row justify-between items-center my-2">
            <p className="text-2xl font-bold">ChatModel V1</p>
            <div className="flex flex-row w-fit justify-end items-center gap-x-2">
              {!devBranchData?.cloud && (
                <FunctionSelector
                  selectedFunctions={selectedFunctions}
                  setSelectedFunctions={setSelectedFunctions}
                />
              )}
              <ModelSelector
                modelName={selectedModel}
                setModel={setSelectedModel}
              />
            </div>
          </div>
          <div className="bg-base-200 flex-grow w-full p-4 rounded-t-box overflow-auto select-none">
            <div className="flex flex-col h-fit gap-y-2 justify-start items-center">
              <PromptComponent
                systemPrompt={modifiedSystemPrompt}
                setSystemPrompt={setModifiedSystemPrompt}
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
              <ChatUI versionUuid="new" />
            </div>
          </div>
        </div>
      </Drawer>

      <Drawer
        open={selectedChatModelVersionUuid != null}
        direction="right"
        style={{ width: createVariantOpen ? "calc(100vw - 5rem)" : "auto" }}
        classNames={classNames(
          createVariantOpen ? "backdrop-blur-md" : "!w-[60vw]",
          "mr-4"
        )}
      >
        {selectedChatModelVersionUuid && (
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
                  {originalVersionData?.is_deployed ? (
                    <div className="flex flex-row justify-start items-center gap-x-3">
                      <p className="text-base-content font-bold text-lg">
                        ChatModel V{originalVersionData?.version}
                      </p>

                      {originalVersionData?.is_published ? (
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
                        ChatModel V{originalVersionData?.uuid.slice(0, 6)}
                      </p>
                      <div className="flex flex-row gap-x-2 items-center">
                        <StatusSelector
                          status={originalVersionData?.status}
                          setStatus={handleUpdateVersionStatus}
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex flex-row gap-x-3">
                    <ModelDisplay modelName={originalVersionData?.model} />
                    {!createVariantOpen && (
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
                    )}
                    {!createVariantOpen && (
                      <button
                        className="flex flex-col gap-y-2 pt-1 items-center btn btn-sm normal-case font-normal bg-transparent border-transparent h-10 hover:bg-neutral-content/20"
                        onClick={() => {
                          setSelectedChatModelVersionUuid(null);
                        }}
                      >
                        <div className="flex flex-col">
                          <XCircle size={22} />
                          <p className="text-base-content text-xs">Esc</p>
                        </div>
                      </button>
                    )}
                  </div>
                </div>
                {createVariantOpen && (
                  <div className="flex flex-row w-full justify-between items-center mb-2">
                    <div className="flex flex-row justify-start items-center gap-x-3">
                      <div className="flex flex-col items-start justify-center">
                        <p className="text-base-content font-medium text-lg">
                          {isNewVersionReady
                            ? "New ChatModel"
                            : `ChatModel V${newVersionCache?.uuid.slice(0, 6)}`}
                        </p>
                        <p className="text-base-content text-sm">
                          From&nbsp;
                          <u>
                            V
                            {originalVersionData?.version ??
                              originalVersionData?.uuid?.slice(0, 6)}
                          </u>
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-row justify-end gap-x-3 items-center">
                      <ModelSelector
                        modelName={selectedModel}
                        setModel={setSelectedModel}
                      />
                    </div>
                  </div>
                )}
              </div>
              {/* Prompt editor */}
              <motion.div className="bg-base-200 w-full p-4 rounded-t-box overflow-auto flex-grow">
                {createVariantOpen ? (
                  <div className="flex flex-row justify-between items-start mb-2">
                    <div className="flex flex-col w-1/2 justify-start gap-y-2 items-start mb-2">
                      <div className="flex flex-row justify-start gap-x-4 items-start"></div>
                      <div className="w-auto flex flex-col items-start justify-start">
                        <label className="label text-xs font-medium">
                          <span className="label-text">Functions</span>
                        </label>
                        {originalVersionData?.functions && (
                          <div className="w-full flex flex-row flex-wrap items-center gap-x-1 gap-y-2">
                            {originalVersionData?.functions?.map(
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
                        {(!originalVersionData?.functions ||
                          originalVersionData?.functions?.length == 0) && (
                          <Badge className="text-sm" variant="muted">
                            No functions
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col w-1/2 justify-start gap-y-2 items-start mb-2">
                      {!devBranchData?.cloud && (
                        <div className="flex flex-col items-start justify-start">
                          <label className="label text-xs font-medium">
                            <span className="label-text">Functions</span>
                          </label>
                          <FunctionSelector
                            selectedFunctions={selectedFunctions}
                            setSelectedFunctions={setSelectedFunctions}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap justify-start gap-x-4 items-start mb-6">
                    <div className="w-auto flex flex-col items-start justify-start">
                      <label className="label text-xs font-medium">
                        <span className="label-text">Functions</span>
                      </label>
                      {originalVersionData?.functions && (
                        <div className="w-full flex flex-row flex-wrap items-center gap-x-1 gap-y-2">
                          {originalVersionData?.functions?.map(
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
                      {(!originalVersionData?.functions ||
                        originalVersionData?.functions?.length == 0) && (
                        <Badge className="text-sm" variant="muted">
                          No functions
                        </Badge>
                      )}
                    </div>
                  </div>
                )}
                <div className="flex flex-col gap-y-2 justify-start items-end">
                  {originalVersionData?.system_prompt &&
                    (createVariantOpen ? (
                      <PromptDiffComponent
                        systemPrompt={originalVersionData?.system_prompt}
                        setSystemPrompt={setModifiedSystemPrompt}
                      />
                    ) : (
                      <PromptComponent
                        systemPrompt={originalVersionData?.system_prompt}
                      />
                    ))}
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
                  <ChatUI
                    versionUuid={selectedChatModelVersionUuid}
                    className={classNames(createVariantOpen && "!w-1/2")}
                  />
                  {createVariantOpen && (
                    <ChatUI
                      versionUuid={
                        isNewVersionReady
                          ? "new"
                          : newVersionCache?.uuid ?? "new"
                      }
                      className="!w-1/2"
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </Drawer>
      <Drawer
        open={createVariantOpen && selectedChatModelVersionUuid != null}
        direction="left"
        classNames="!w-[5rem] pl-2 relative"
      >
        {createVariantOpen && selectedChatModelVersionUuid != null && (
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
              {chatModelVersionListData?.map((versionData) => {
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
                      "flex flex-row items-center gap-x-2 rounded-full p-2 backdrop-blur-sm hover:bg-base-content/10 transition-all cursor-pointer relative",
                      "active:scale-90",
                      selectedChatModelVersionUuid === versionData.uuid
                        ? "bg-base-content/20"
                        : "bg-transparent",
                      newVersionCache?.uuid == versionData.uuid &&
                        "tooltip tooltip-bottom tooltip-primary"
                    )}
                    data-tip="New!"
                    key={versionData.version ?? versionData.uuid.slice(0, 3)}
                    onClick={() => {
                      setNewVersionCache(null);
                      setSelectedChatModelVersionUuid(versionData.uuid);
                    }}
                  >
                    <div
                      className={classNames(
                        "absolute h-2 w-2 bg-secondary top-0 right-0 rounded-full z-50",
                        newVersionCache?.uuid == versionData.uuid
                          ? "animate-pulse"
                          : "hidden"
                      )}
                    />
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

const PromptComponent = ({
  systemPrompt,
  setSystemPrompt,
}: {
  systemPrompt: string;
  setSystemPrompt?: (prompt: string) => void;
}) => {
  const [height, setHeight] = useState(100);
  const windowHeight = useWindowHeight();
  const editorRef = useRef(null);
  const { setFocusedEditor } = useChatModelVersionStore();

  const handleEditorDidMount = (editor: editor.IStandaloneCodeEditor) => {
    const contentHeight = editor.getContentHeight();
    editorRef.current = editor;

    if (contentHeight) {
      setHeight(contentHeight);
    }

    editor.onDidFocusEditorWidget(() => {
      setFocusedEditor(editorRef.current);
    });
  };

  useEffect(() => {
    const contentHeight = editorRef.current?.getContentHeight();
    const minHeight = 200;
    const maxHeight = windowHeight * 0.7;
    if (contentHeight) {
      setHeight(Math.min(Math.max(minHeight, contentHeight), maxHeight));
    }
  }, [editorRef.current?.getContentHeight()]);

  return (
    <motion.div className="w-full h-fit flex flex-col justify-start items-center bg-base-100 rounded-box">
      <div
        className={classNames(
          "w-full h-10 min-h-[2.5rem] flex flex-row justify-start items-center py-1 px-3"
        )}
      >
        <p className="text-base-content font-medium">
          System prompt (Custom instructions)
        </p>
      </div>
      <PromptEditor
        value={systemPrompt}
        onChange={(value) => {
          if (setSystemPrompt) {
            setSystemPrompt(value);
          }
        }}
        options={{
          readOnly: setSystemPrompt == undefined,
        }}
        loading={<div className="loading loading-xs loading-dots" />}
        onMount={handleEditorDidMount}
        height={height}
      />
    </motion.div>
  );
};

const PromptDiffComponent = ({
  systemPrompt,
  setSystemPrompt,
}: {
  systemPrompt: string;
  setSystemPrompt: (prompt: string) => void;
}) => {
  const windowHeight = useWindowHeight();
  const [open, setOpen] = useState(true);
  const [height, setHeight] = useState(30);
  const originalEditorRef = useRef(null);
  const modifiedEditorRef = useRef(null);
  const { setFocusedEditor } = useChatModelVersionStore();

  const handleEditorDidMount = (editor: MonacoDiffEditor, monaco: Monaco) => {
    originalEditorRef.current = editor.getOriginalEditor();
    modifiedEditorRef.current = editor.getModifiedEditor();
    const originalHeight = originalEditorRef.current?.getContentHeight();
    const maxHeight = windowHeight * 0.7;
    if (originalHeight) {
      setHeight(Math.min(originalHeight, maxHeight));
    }
    modifiedEditorRef.current?.onDidFocusEditorWidget(() => {
      setFocusedEditor(modifiedEditorRef.current);
    });

    modifiedEditorRef.current.onDidChangeModelContent(() => {
      setSystemPrompt(modifiedEditorRef.current?.getValue());
      const modifiedHeight = modifiedEditorRef.current?.getContentHeight();
      const maxHeight = windowHeight * 0.7;
      if (modifiedHeight) {
        setHeight(Math.min(modifiedHeight, maxHeight));
      }
    });
  };

  useEffect(() => {
    const originalHeight = originalEditorRef.current?.getContentHeight();
    const modifiedHeight = modifiedEditorRef.current?.getContentHeight();
    const maxHeight = windowHeight * 0.7;
    if (modifiedHeight > originalHeight) {
      setHeight(Math.min(modifiedHeight, maxHeight));
    } else {
      setHeight(Math.min(originalHeight, maxHeight));
    }
  }, [originalEditorRef.current, modifiedEditorRef.current]);

  return (
    <div className="w-full h-fit flex flex-col justify-start items-center bg-base-100 rounded-box">
      <div
        className={classNames(
          "w-full h-10 min-h-[2.5rem] flex flex-row justify-start items-center py-1 px-3 cursor-pointer"
        )}
      >
        <p className="text-base-content font-semibold">
          System prompt (Custom instructions)
        </p>
      </div>
      {open && (
        <PromptDiffEditor
          className="gap-x-8"
          original={systemPrompt}
          modified={systemPrompt}
          loading={<div className="loading loading-xs loading-dots" />}
          onMount={handleEditorDidMount}
          height={height}
        />
      )}
    </div>
  );
};

function ModelVersionNode({ data }) {
  const { selectedChatModelVersionUuid, setSelectedChatModelVersionUuid } =
    useChatModelVersionStore();
  return (
    <div
      className={classNames(
        "p-2 rounded-full flex justify-center items-center",
        "w-20 h-20 visible cursor-pointer",
        "transition-all",
        selectedChatModelVersionUuid == data.uuid
          ? "border-neutral-content border-2"
          : "border-none",
        data.status == "published" && "bg-secondary/80 hover:bg-secondary/50",
        data.status == "deployed" && "bg-blue-500/60 hover:bg-blue-500/30",
        data.status != "published" && data.status != "deployed" && "bg-base-200"
      )}
      onClick={() => setSelectedChatModelVersionUuid(data.uuid)}
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
