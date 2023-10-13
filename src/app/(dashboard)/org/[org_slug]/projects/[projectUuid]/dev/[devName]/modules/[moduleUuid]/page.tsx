"use client";

import { Drawer } from "@/components/Drawer";
// import { useModuleVersion } from "@/hooks/useModuleVersion";
import { useModuleVersion } from "@/hooks/dev/useModuleVersion";
import { useModule } from "@/hooks/dev/useModule";
import { Prompt, useModuleVersionStore } from "@/stores/moduleVersionStore";
import classNames from "classnames";
import { useEffect, useMemo, useRef, useState } from "react";
import ReactFlow, {
  Background,
  BackgroundVariant,
  Handle,
  Position,
} from "reactflow";
import { motion } from "framer-motion";
import { useModuleVersionDetails } from "@/hooks/useModuleVersionDetails";
import { CaretDown, GitBranch, Play, XCircle } from "@phosphor-icons/react";
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

export default function Page() {
  const params = useParams();
  const { createSupabaseClient } = useSupabaseClient();
  const { moduleListData } = useModule();
  const { versionListData, refetchVersionListData } = useModuleVersion();
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [createVariantOpen, setCreateVariantOpen] = useState(false);
  const {
    newVersionUuidCache,
    newPromptCache,
    selectedVersionUuid,
    updateRunLogs,
    updatePrompts,
    setSelectedVersionUuid,
    setNewVersionUuidCache,
    setNewPromptCache,
  } = useModuleVersionStore();
  const monaco = useMonaco();
  const nodeTypes = useMemo(() => ({ moduleVersion: ModuleVersionNode }), []);
  const [editorContentChanged, setEditorContentChanged] = useState(false);
  const [modifiedPrompts, setModifiedPrompts] = useState<Prompt[]>([]);

  const { promptListData } = useModuleVersionDetails(selectedVersionUuid);

  const moduleVersionData = useMemo(() => {
    return versionListData?.find(
      (version) => version.uuid === selectedVersionUuid
    );
  }, [selectedVersionUuid, versionListData]);

  const originalPrompts = useMemo(() => {
    return promptListData?.map((prompt) => prompt.content);
  }, [promptListData]);

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
            label: item.candidate_version,
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

  async function handleClickRun(isNew: boolean) {
    const toastId = toast.loading("Running...");

    let prompts: Prompt[];
    if (isNew) {
      prompts = promptListData?.map((prompt, idx) => {
        return {
          role: prompt.role as string,
          step: prompt.step as number,
          content: monaco.editor
            ?.getDiffEditors()
            [idx]?.getModel()
            ?.modified?.getValue(),
        };
      });
    } else {
      prompts = promptListData;
    }

    let cacheRawOutput = "";
    const cacheParsedOutputs = {};

    await streamLLMModuleRun({
      projectUuid: params?.projectUuid as string,
      devName: params?.devName as string,
      moduleUuid: params?.moduleUuid as string,
      moduleName: moduleListData?.find(
        (module) => module.uuid === params?.moduleUuid
      ).name,
      sampleName: null,
      prompts: isNew
        ? promptListData?.map((prompt, idx) => {
            return {
              role: prompt.role as string,
              step: prompt.step as number,
              content: monaco.editor
                ?.getDiffEditors()
                [idx]?.getModel()
                ?.modified?.getValue(),
            };
          })
        : promptListData,
      model: moduleVersionData.model,
      fromUuid: isNew ? moduleVersionData.uuid : null,
      uuid: isNew ? null : moduleVersionData.uuid,
      onNewData: (data) => {
        switch (data?.status) {
          case "completed":
            toast.update(toastId, {
              render: "Completed",
              type: "success",
              autoClose: 2000,
              isLoading: false,
            });
            updatePrompts(moduleVersionData.uuid, prompts);
            if (isNew) {
              refetchVersionListData();
            }
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
        if (data?.inputs) {
          updateRunLogs(moduleVersionData.uuid, {
            inputs: data?.inputs,
          });
        }
        if (data?.raw_output) {
          cacheRawOutput += data?.raw_output;
          updateRunLogs(moduleVersionData.uuid, {
            raw_output: cacheRawOutput,
          });
        }
        // console.log(data);
        if (data?.parsed_outputs) {
          const parsedOutputs = data?.parsed_outputs;
          console.log(parsedOutputs);
          for (const key in parsedOutputs) {
            if (key in cacheParsedOutputs) {
              cacheParsedOutputs[key] += parsedOutputs[key];
            } else {
              cacheParsedOutputs[key] = parsedOutputs[key];
            }
          }
          console.log(cacheParsedOutputs);
          updateRunLogs(moduleVersionData.uuid, {
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
      <Drawer
        open={selectedVersionUuid != null}
        direction="right"
        classNames={classNames(
          createVariantOpen ? "!w-[90vw] backdrop-blur-md" : "!w-[45vw]",
          "mr-4"
        )}
      >
        <div className="w-full h-full bg-transparent flex flex-row justify-end items-start">
          <div
            className={classNames(
              "w-full h-full bg-transparent p-4 flex flex-col justify-start",
              createVariantOpen && "pr-0"
            )}
          >
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
                      From <u>Prompt V{moduleVersionData?.candidate_version}</u>
                    </p>
                  </div>
                  <button
                    className={classNames(
                      "flex flex-row gap-x-2 items-center btn btn-outline btn-sm normal-case font-normal h-10 bg-base-content hover:bg-base-content/80",
                      "disabled:bg-neutral-content"
                    )}
                    onClick={() => handleClickRun(true)}
                    disabled={!isNewVersionReady}
                  >
                    <p className="text-base-100">Run</p>
                    <Play className="text-base-100" size={20} weight="fill" />
                  </button>
                </div>
              )}
            </div>
            <motion.div className="bg-base-200 h-full w-full p-4 rounded-box overflow-auto">
              <div className="flex flex-col h-full gap-y-2 justify-start items-start">
                {promptListData?.map((prompt) =>
                  createVariantOpen ? (
                    <PromptInputComponent
                      prompt={prompt}
                      setPrompts={setModifiedPrompts}
                    />
                  ) : (
                    <PromptComponent prompt={prompt} />
                  )
                )}
              </div>
            </motion.div>
            <div className="flex flex-row justify-between items-start mt-4 gap-x-4">
              <RunLogComponent versionUuid={selectedVersionUuid} />
              {createVariantOpen && <RunLogComponent versionUuid={null} />}
            </div>
          </div>
        </div>
      </Drawer>
      <Drawer
        open={createVariantOpen && selectedVersionUuid != null}
        direction="left"
        classNames="w-[5vw] ml-4 relative"
      >
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
              <div className="flex flex-row" key={version.candidate_version}>
                <p className="text-base-content font-semibold text-2xl">
                  V{version.candidate_version}
                </p>
              </div>
            );
          })}
        </div>
      </Drawer>
    </div>
  );
}

const PromptComponent = ({ prompt }) => {
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
        <Editor
          value={prompt.content}
          theme="vs-dark"
          options={{
            readOnly: true,
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

const PromptInputComponent = ({ prompt, setPrompts }) => {
  const [open, setOpen] = useState(true);
  const [text, setText] = useState(prompt.content);
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
          modified={text}
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

const RunLogComponent = ({ versionUuid }: { versionUuid?: string }) => {
  const [showRaw, setShowRaw] = useState(true);
  const { runLogs } = useModuleVersionStore();
  const runLog = useMemo(() => {
    if (versionUuid) {
      return runLogs[versionUuid];
    } else {
      return null;
    }
  }, [runLogs, versionUuid]);

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
            <tr className="align-top">
              <td className="align-top">
                <ReactJson
                  src={runLog?.inputs}
                  name={false}
                  displayDataTypes={false}
                  displayObjectSize={false}
                  enableClipboard={false}
                  theme="google"
                />
              </td>
              <td className="align-top">
                {showRaw ? (
                  runLog?.raw_output
                ) : (
                  <ReactJson
                    src={runLog?.parsed_outputs}
                    name={false}
                    displayDataTypes={false}
                    displayObjectSize={false}
                    enableClipboard={false}
                    theme="google"
                  />
                )}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
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
      <div className="flex flex-row justify-center items-center gap-x-1">
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
