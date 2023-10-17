"use client";

import { Drawer } from "@/components/Drawer";
// import { useModuleVersion } from "@/hooks/useModuleVersion";
import { useModuleVersion } from "@/hooks/dev/useModuleVersion";
import { useModule } from "@/hooks/dev/useModule";
import { useModuleVersionDetails } from "@/hooks/dev/useModuleVersionDetails";
import {
  Prompt,
  RunLog,
  useModuleVersionStore,
} from "@/stores/moduleVersionStore";
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
  GitBranch,
  Play,
  Trash,
  XCircle,
} from "@phosphor-icons/react";
import {
  DiffEditor,
  Editor,
  Monaco,
  MonacoDiffEditor,
  useMonaco,
} from "@monaco-editor/react";
import { editor } from "monaco-editor/esm/vs/editor/editor.api";
import "reactflow/dist/style.css";
import { useHotkeys } from "react-hotkeys-hook";
import { streamLLMModuleRun, subscribeDevBranchStatus } from "@/apis/dev";
import { useParams } from "next/navigation";
import { SelectField } from "@/components/SelectField";
import { StatusIndicator } from "@/components/StatusIndicator";
import { useSupabaseClient } from "@/apis/base";
import { toast } from "react-toastify";
import ReactJson from "react-json-view";
import { useRunLogs } from "@/hooks/dev/useRunLog";
import { v4 as uuidv4 } from "uuid";
import { PlusSquare } from "@phosphor-icons/react/dist/ssr";
import { ModalPortal } from "@/components/ModalPortal";
import { ModelSelector } from "@/components/ModelSelector";
import { cloneDeep } from "@/utils";

export default function Page() {
  const params = useParams();
  const { createSupabaseClient } = useSupabaseClient();
  const { moduleListData } = useModule();
  const { versionListData, refetchVersionListData } = useModuleVersion();
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [createVariantOpen, setCreateVariantOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState("gpt-3.5-turbo");
  const {
    newVersionUuidCache,
    newPromptCache,
    selectedVersionUuid,
    addRunTask,
    updateRunLogs,
    updatePrompts,
    setSelectedVersionUuid,
    setNewVersionUuidCache,
    setNewPromptCache,
  } = useModuleVersionStore();
  const monaco = useMonaco();
  const nodeTypes = useMemo(() => ({ moduleVersion: ModuleVersionNode }), []);
  const [modifiedPrompts, setModifiedPrompts] = useState<Prompt[]>([]);
  const { promptListData } = useModuleVersionDetails(selectedVersionUuid);
  const { refetchRunLogData } = useRunLogs(selectedVersionUuid);

  useEffect(() => {
    setSelectedVersionUuid(null);
  }, []);

  const moduleVersionData = useMemo(() => {
    return versionListData?.find(
      (version) => version.uuid === selectedVersionUuid
    );
  }, [selectedVersionUuid, versionListData]);

  const originalPrompts = useMemo(() => {
    if (!modifiedPrompts && promptListData?.length > 0) {
      setModifiedPrompts(cloneDeep(promptListData));
    }
    return promptListData?.map((prompt) => prompt.content);
  }, [promptListData]);

  useEffect(() => {
    if (promptListData?.length > 0) {
      setModifiedPrompts(cloneDeep(promptListData));
    }
  }, [selectedVersionUuid, promptListData]);

  useEffect(() => {
    console.log(modifiedPrompts);
  }, [modifiedPrompts]);

  const isNewVersionReady = useMemo(() => {
    if (!createVariantOpen) return false;
    // const modifiedValues = monaco?.editor
    //   ?.getDiffEditors()
    //   ?.map((editor) => editor?.getModel()?.modified?.getValue());

    if (newVersionUuidCache?.length > 0) {
      return newPromptCache?.some(
        (prompt, idx) => prompt.content !== modifiedPrompts[idx].content
      );
    } else {
      return !originalPrompts?.every(
        (val, idx) => val.content === modifiedPrompts[idx].content
      );
    }
  }, [newVersionUuidCache, newPromptCache, modifiedPrompts]);

  const getChildren = (parentId: string) => {
    return versionListData.filter((item) => item.from_uuid === parentId);
  };

  useHotkeys("esc", () => {
    if (createVariantOpen) {
      setCreateVariantOpen(false);
    } else if (selectedVersionUuid) {
      setSelectedVersionUuid(null);
    }
  });

  // Subscribe to dev branch sync status
  useEffect(() => {
    setSelectedVersionUuid(null);
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
    if (!versionListData || versionListData?.length === 0) return;
    const generatedNodes = [];
    const generatedEdges = [];

    const findMaxNodesAtLevel = (data) => {
      const levelMap: Record<any, number> = {};

      const countNodes = (items, level) => {
        for (const item of items) {
          if (!levelMap[level]) {
            levelMap[level] = 0;
          }
          levelMap[level]++;

          const children = getChildren(item.uuid);
          if (children && children.length > 0) {
            countNodes(children, level + 1);
          }
        }
      };

      countNodes(data, 0);
      return Math.max(...Object.values(levelMap));
    };

    const maxNodes = findMaxNodesAtLevel(versionListData);

    const buildNodes = (data, level) => {
      const nodesAtThisLevel = data.length;
      const spaceBetween = 1000 / (maxNodes + 1); // you can adjust the 1000 value based on your preferred width

      for (let i = 0; i < nodesAtThisLevel; i++) {
        const item = data[i];
        const xPosition = (i + 1) * spaceBetween;
        let status: string;
        if (item.is_published) {
          status = "published";
        } else if (item.candidate_version) {
          status = "deployed";
        } else {
          status = item.status;
        }
        generatedNodes.push({
          id: item.uuid.toString(),
          type: "moduleVersion",
          data: {
            label: item.candidate_version ?? item.uuid.slice(0, 3),
            uuid: item.uuid,
            status: status,
          },
          position: { x: xPosition, y: level * 150 }, // adjusted y position for better spacing
        });

        if (item.from_uuid) {
          generatedEdges.push({
            id: `e${item.uuid}-${item.from_uuid}`,
            source: item.from_uuid,
            target: item.uuid,
          });
        }

        const children = getChildren(item.uuid);
        if (children && children.length > 0) {
          buildNodes(children, level + 1);
        }
      }
    };

    buildNodes(
      versionListData.filter((v) => !v.from_uuid),
      0
    );

    setNodes(generatedNodes);
    setEdges(generatedEdges);
  }, [versionListData]);

  useEffect(() => {
    if (!selectedVersionUuid) return;
    setCreateVariantOpen(false);
  }, [selectedVersionUuid]);

  function handleClickCreateVariant() {
    setCreateVariantOpen(true);
  }

  // Run LLM call
  async function handleClickRun(isNew: boolean) {
    // addRunTask(isNew ? "new" : moduleVersionData.uuid);
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

    const uuid = uuidv4();
    await streamLLMModuleRun({
      projectUuid: params?.projectUuid as string,
      devName: params?.devName as string,
      moduleUuid: params?.moduleUuid as string,
      moduleName: moduleListData?.find(
        (module) => module.uuid === params?.moduleUuid
      ).name,
      sampleName: null,
      prompts: prompts,
      model: isNew ? selectedModel : moduleVersionData.model,
      fromUuid: isNew ? moduleVersionData?.uuid ?? null : null,
      uuid: isNew ? null : moduleVersionData?.uuid,
      onNewData: (data) => {
        console.log(data);
        switch (data?.status) {
          case "completed":
            // updatePrompts(moduleVersionData.uuid, prompts);
            if (isNew) {
              refetchVersionListData();
              if (!moduleVersionData?.uuid) {
                setSelectedVersionUuid(newVersionUuidCache);
              }
            }
            refetchRunLogData();
            toast.update(toastId, {
              render: "Completed",
              type: "success",
              autoClose: 2000,
              isLoading: false,
            });
            break;
          case "failed":
            toast.update(toastId, {
              render: `${data?.log}`,
              type: "error",
              autoClose: 2000,
              isLoading: false,
            });
            break;
        }
        if (data?.llm_module_version_uuid) {
          setNewVersionUuidCache(data?.llm_module_version_uuid);
        }
        if (data?.inputs) {
          updateRunLogs(isNew ? "new" : moduleVersionData?.uuid, uuid, {
            inputs: data?.inputs,
          });
        }
        if (data?.raw_output) {
          cacheRawOutput += data?.raw_output;
          updateRunLogs(isNew ? "new" : moduleVersionData?.uuid, uuid, {
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
          updateRunLogs(isNew ? "new" : moduleVersionData?.uuid, uuid, {
            parsed_outputs: cacheParsedOutputs,
          });
        }
      },
    });
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
        direction="right"
        classNames="!w-[100vw] px-4 flex flex-col justify-start items-center pb-4"
        duration={200}
      >
        <div className="flex flex-col justify-start w-full max-w-4xl h-full">
          <div className="flex flex-row justify-between items-center mb-2">
            <p className="text-2xl font-bold">Prompt V1</p>
            <div className="flex flex-row w-fit justify-end items-center gap-x-2">
              <ModelSelector
                modelName={selectedModel}
                setModel={setSelectedModel}
              />
              <button
                className="flex flex-row gap-x-2 items-center btn btn-outline btn-sm normal-case font-normal h-10 border-base-content hover:bg-base-content/20"
                onClick={() => handleClickRun(true)}
                disabled={
                  !(modifiedPrompts?.length > 0) ||
                  modifiedPrompts?.every((prompt) => prompt.content === "")
                }
              >
                <p className="text-base-content">Run</p>
                <Play className="text-base-content" size={20} weight="fill" />
              </button>
            </div>
          </div>
          <div className="bg-base-200 flex-grow w-full p-4 rounded-box overflow-auto mb-4">
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
          <RunLogSection versionUuid="new" />
        </div>
      </Drawer>
      <Drawer
        open={selectedVersionUuid != null}
        direction="right"
        classNames={classNames(
          createVariantOpen ? "!w-[90vw] backdrop-blur-md" : "!w-[45vw]",
          "mr-4"
        )}
      >
        {selectedVersionUuid && (
          <div className="w-full h-full bg-transparent flex flex-row justify-end items-start">
            <div
              className={classNames(
                "w-full h-full bg-transparent p-4 flex flex-col justify-start",
                createVariantOpen && "pr-0"
              )}
            >
              {/* Header */}
              <div className="flex flex-row justify-between items-center gap-x-8">
                <div className="flex flex-row w-full justify-between items-center mb-2">
                  {moduleVersionData?.candidate_version ? (
                    <div className="flex flex-row justify-start items-center gap-x-3">
                      <p className="text-base-content font-bold text-lg">
                        Prompt V{moduleVersionData?.candidate_version}
                      </p>

                      {moduleVersionData?.is_published ? (
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
                        Prompt V{moduleVersionData?.uuid.slice(0, 6)}
                      </p>
                      <div className="flex flex-row gap-x-2 items-center">
                        <StatusIndicator status={moduleVersionData?.status} />
                        <p>{moduleVersionData?.status}</p>
                      </div>
                    </div>
                  )}
                  {createVariantOpen ? (
                    <button
                      className="flex flex-row gap-x-2 items-center btn btn-outline btn-sm normal-case font-normal h-10 border-base-content hover:bg-base-content/20"
                      onClick={() => handleClickRun(false)}
                    >
                      <p className="text-base-content">Run</p>
                      <Play
                        className="text-base-content"
                        size={20}
                        weight="fill"
                      />
                    </button>
                  ) : (
                    <div className="flex flex-row gap-x-2">
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
                        From{" "}
                        <u>Prompt V{moduleVersionData?.candidate_version}</u>
                      </p>
                    </div>
                    <div className="flex flex-row justify-end gap-x-3 items-center">
                      <ModelSelector
                        modelName={selectedModel}
                        setModel={setSelectedModel}
                      />
                      <button
                        className={classNames(
                          "flex flex-row gap-x-2 items-center btn btn-outline btn-sm normal-case font-normal h-10 bg-base-content hover:bg-base-content/80",
                          "disabled:bg-neutral-content"
                        )}
                        onClick={() => handleClickRun(true)}
                        disabled={!isNewVersionReady}
                      >
                        <p className="text-base-100">Run</p>
                        <Play
                          className="text-base-100"
                          size={20}
                          weight="fill"
                        />
                      </button>
                    </div>
                  </div>
                )}
              </div>
              {/* Prompt editor */}
              <motion.div className="bg-base-200 flex-grow w-full p-4 rounded-box overflow-auto">
                <div className="flex flex-col h-full gap-y-2 justify-start items-end">
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
              <div className="flex flex-row justify-between items-start mt-4 gap-x-4">
                <RunLogSection versionUuid={selectedVersionUuid} />
                {createVariantOpen && <RunLogSection versionUuid="new" />}
              </div>
            </div>
          </div>
        )}
      </Drawer>
      <Drawer
        open={createVariantOpen && selectedVersionUuid != null}
        direction="left"
        classNames="w-[5vw] ml-4 relative"
      >
        {createVariantOpen && selectedVersionUuid != null && (
          <div className="w-full h-full bg-transparent flex flex-col justify-center items-start gap-y-3">
            <button
              className="absolute top-6 -left-2 flex flex-col gap-y-2 pt-1 items-center btn btn-sm normal-case font-normal bg-transparent border-transparent h-10 hover:bg-neutral-content/20"
              onClick={() => {
                setCreateVariantOpen(false);
              }}
            >
              <div className="flex flex-col">
                <XCircle size={22} />
                <p className="text-base-content text-xs">Esc</p>
              </div>
            </button>
            {versionListData?.map((version) => {
              return (
                <div
                  className="flex flex-row"
                  key={version.candidate_version ?? version.uuid.slice(0, 3)}
                >
                  <p className="text-base-content font-semibold text-2xl">
                    V{version.candidate_version ?? version.uuid.slice(0, 3)}
                  </p>
                </div>
              );
            })}
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

  const handleEditorDidMount = (editor: editor.IStandaloneCodeEditor) => {
    const contentHeight = editor.getContentHeight();
    editorRef.current = editor;
    if (contentHeight) {
      setHeight(contentHeight);
    }
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
                return newPrompts.map((p, index) => ({
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
        <Editor
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
          theme="vs-dark"
          options={{
            readOnly: setPrompts == undefined,
            scrollBeyondLastLine: false,
            wordWrap: "on",
            scrollbar: {
              alwaysConsumeMouseWheel: false,
            },
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

  const handleEditorDidMount = (editor: MonacoDiffEditor, monaco: Monaco) => {
    originalEditorRef.current = editor.getOriginalEditor();
    modifiedEditorRef.current = editor.getModifiedEditor();
    const originalHeight = originalEditorRef.current?.getContentHeight();
    const maxHeight = window.innerHeight * 0.7;
    if (originalHeight) {
      setHeight(Math.min(originalHeight, maxHeight));
    }
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
        <DiffEditor
          className="gap-x-8"
          original={prompt.content}
          modified={prompt.content}
          theme="vs-dark"
          loading={<div className="loading loading-xs loading-dots" />}
          onMount={handleEditorDidMount}
          height={height}
          options={{
            scrollBeyondLastLine: false,
            wordWrap: "on",
            scrollbar: {
              alwaysConsumeMouseWheel: false,
            },
          }}
        />
      )}
    </motion.div>
  );
};

const RunLogSection = ({ versionUuid }: { versionUuid: string | "new" }) => {
  const [showRaw, setShowRaw] = useState(true);
  const { runLogData } = useRunLogs(versionUuid);
  const { runTasksCount, runLogs } = useModuleVersionStore();
  const [runLogList, setRunLogList] = useState<RunLog[]>([]);

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
    <div className="w-full h-fit max-h-[40vh] rounded-box items-center bg-base-200 p-4 flex flex-col gap-y-2 justify-start">
      <div className="w-full h-fit flex flex-row">
        <div className="w-full">
          <p className="text-lg font-medium ps-1">Input</p>
        </div>
        <div className="w-full flex flex-row gap-x-6 items-center">
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
        </div>
      </div>
      <div className="w-full h-fit bg-base-100 rounded overflow-y-auto">
        <table className="w-full table table-fixed">
          <tbody className="">
            {runLogList?.map((log) => (
              <RunLogComponent showRaw={showRaw} runLogData={log} />
            ))}
          </tbody>
        </table>
      </div>
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
      <td className="align-top">
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
      <td className="align-top">
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
    </tr>
  );
};

function ModuleVersionNode({ data }) {
  const { selectedVersionUuid, setSelectedVersionUuid } =
    useModuleVersionStore();
  return (
    <div
      className={classNames(
        "p-4 rounded-full flex justify-center items-center",
        "w-20 h-20 visible cursor-pointer",
        "transition-all hover:bg-base-300",
        selectedVersionUuid == data.uuid
          ? "border-neutral-content border-2"
          : "border-none",
        data.status == "published" && "bg-secondary/80",
        data.status == "deployed" && "bg-blue-500/60",
        data.status != "published" && data.status != "deployed" && "bg-base-200"
      )}
      onClick={() => setSelectedVersionUuid(data.uuid)}
    >
      <Handle type="target" position={Position.Top} />
      <div className="flex flex-col justify-center items-center gap-y-1">
        {data.status != "published" && data.status != "deployed" && (
          <StatusIndicator status={data.status} />
        )}
        <p className="text-base-content font-medium">
          V<span className="font-bold text-xl">{data.label}</span>
        </p>
      </div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}
