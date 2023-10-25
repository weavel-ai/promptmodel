"use client";

import { Drawer } from "@/components/Drawer";
import { useModuleVersion } from "@/hooks/useModuleVersion";
import { useModuleVersionStore } from "@/stores/moduleVersionStore";
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
import { CaretDown, RocketLaunch, XCircle } from "@phosphor-icons/react";
import { toast } from "react-toastify";
import { updatePublishedModuleVersion } from "@/apis/moduleVersion";
import { useSupabaseClient } from "@/apis/base";
import "reactflow/dist/style.css";
import { useRunLog } from "@/hooks/useRunLog";
import { Json } from "@/supabase.types";
import { isArray } from "util";
import { RunLog } from "@/apis/runlog";
import { Editor } from "@monaco-editor/react";
import { editor } from "monaco-editor";
import { useHotkeys } from "react-hotkeys-hook";
import { hierarchy, tree, stratify } from "d3-hierarchy";
import { useQueryClient } from "@tanstack/react-query";
import { ResizableSeparator } from "@/components/ResizableSeparator";

const initialNodes = [];
const initialEdges = [];

export default function Page() {
  const { createSupabaseClient } = useSupabaseClient();
  const { versionListData, refetchVersionListData } = useModuleVersion();
  const [nodes, setNodes] = useState(initialNodes);
  const [edges, setEdges] = useState(initialEdges);
  const { selectedVersionUuid, setSelectedVersionUuid } =
    useModuleVersionStore();
  const nodeTypes = useMemo(() => ({ moduleVersion: ModuleVersionNode }), []);

  const queryClient = useQueryClient();

  const { promptListData, moduleVersionData } =
    useModuleVersionDetails(selectedVersionUuid);

  const { runLogData } = useRunLog(selectedVersionUuid);

  const [lowerBoxHeight, setLowerBoxHeight] = useState(240);

  useHotkeys("esc", () => {
    setSelectedVersionUuid(null);
  });

  // Build nodes
  useEffect(() => {
    if (!versionListData || versionListData.length === 0) return;
    const generatedEdges = [];

    const root = stratify()
      .id((d: any) => d.uuid)
      .parentId((d: any) => d.from_uuid)(versionListData);

    // Calculate the maximum number of nodes at any depth.
    const maxNodesAtDepth = Math.max(
      ...root.descendants().map((d: any) => d.depth)
    );
    const requiredWidth = maxNodesAtDepth * 360;

    // Use the smaller of window width and required width.
    const layoutWidth = Math.min(window.innerWidth, requiredWidth);
    const layout = tree().size([layoutWidth, root.height * 150]);

    const nodes = layout(root).descendants();

    const generatedNodes = nodes.map((node: any) => {
      const item = node.data;

      if (item.from_uuid) {
        generatedEdges.push({
          id: `e${item.uuid}-${item.from_uuid}`,
          source: item.from_uuid,
          target: item.uuid,
        });
      }

      return {
        id: item.uuid.toString(),
        type: "moduleVersion",
        data: {
          label: item.version,
          uuid: item.uuid,
          isPublished: item.is_published,
        },
        position: { x: node.x, y: node.depth * 150 },
      };
    });

    setNodes(generatedNodes);
    setEdges(generatedEdges);
  }, [versionListData]);

  async function handleClickPublish() {
    const toastId = toast.loading("Publishing...");

    const previousPublishedUuid = versionListData?.find(
      (v) => v.is_published
    )?.uuid;

    await updatePublishedModuleVersion(
      await createSupabaseClient(),
      selectedVersionUuid,
      previousPublishedUuid
    );
    await refetchVersionListData();
    queryClient.invalidateQueries({
      predicate: (query: any) =>
        query.queryKey[0] === "moduleVersionData" &&
        (query.queryKey[1]?.uuid === selectedVersionUuid ||
          query.queryKey[1]?.uuid == previousPublishedUuid),
    });
    toast.update(toastId, {
      render: "Published successfully!",
      type: "success",
      isLoading: false,
      autoClose: 2000,
    });
  }

  return (
    <div className="w-full h-full">
      <ReactFlow
        nodeTypes={nodeTypes}
        nodes={nodes}
        edges={edges}
        proOptions={{ hideAttribution: true }}
        fitView={true}
        onPaneClick={() => {
          setSelectedVersionUuid(null);
        }}
      >
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
      </ReactFlow>
      <Drawer
        open={selectedVersionUuid != null}
        direction="right"
        classNames="!w-[45vw]"
      >
        <div className="w-full h-full bg-transparent p-4 flex flex-col justify-start">
          <div className="flex flex-row justify-between items-center mb-2">
            <div className="flex flex-row gap-x-2 justify-start items-center">
              <p className="text-base-content font-bold text-lg">
                Prompt V{moduleVersionData?.version}
              </p>
              {moduleVersionData?.is_published && (
                <div className="flex flex-row gap-x-2 items-center px-2 justify-self-start">
                  <div className="w-2 h-2 rounded-full bg-secondary" />
                  <p className="text-base-content font-medium text-sm">
                    Published
                  </p>
                </div>
              )}
            </div>
            <div className="flex flex-row gap-x-2 items-center">
              {!moduleVersionData?.is_published && (
                <button
                  className="flex flex-row gap-x-2 items-center btn btn-outline btn-sm normal-case font-normal h-10 border-[1px] border-neutral-content hover:bg-neutral-content/20"
                  onClick={handleClickPublish}
                >
                  <RocketLaunch
                    className="text-secondary"
                    size={20}
                    weight="fill"
                  />
                  <p className="text-base-content">Publish</p>
                </button>
              )}

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
          </div>
          <div
            className="flex flex-col justify-between"
            style={{
              height: window.innerHeight - 120,
            }}
          >
            <motion.div
              className="bg-base-200 w-full p-4 rounded-t-box overflow-auto flex-grow-0"
              style={{
                height: window.innerHeight - lowerBoxHeight - 120,
              }}
            >
              <div className="flex flex-col gap-y-2 justify-start items-start">
                {promptListData?.map((prompt) => (
                  <PromptComponent prompt={prompt} />
                ))}
              </div>
            </motion.div>
            <div className="min-h-[120px] relative backdrop-blur-md">
              <ResizableSeparator
                height={lowerBoxHeight}
                setHeight={setLowerBoxHeight}
              />
              <div
                className="flex flex-col items-start gap-y-1 !my-4"
                style={{
                  height: lowerBoxHeight,
                }}
              >
                <p className="text-xl font-bold mb-1">Run Logs</p>
                <RunLogComponent runLogData={runLogData} />
              </div>
            </div>
          </div>
        </div>
      </Drawer>
    </div>
  );
}

const PromptComponent = ({ prompt }) => {
  const [open, setOpen] = useState(false);
  const [height, setHeight] = useState(30);
  const editorRef = useRef(null);

  const handleEditorDidMount = (editor: editor.IStandaloneCodeEditor) => {
    const contentHeight = editor.getContentHeight();
    editorRef.current = editor;
    const maxHeight = window.innerHeight * 0.7;
    if (contentHeight) {
      setHeight(Math.min(contentHeight, maxHeight));
    }
  };

  return (
    <motion.div
      key={prompt.step}
      className="w-full flex flex-col justify-start items-center bg-base-100 rounded-box"
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
          className="overflow-auto"
          height={height}
        />
      )}
    </motion.div>
  );
};

const RunLogComponent = ({ runLogData }: { runLogData: RunLog[] }) => {
  const [showRaw, setShowRaw] = useState(true);

  return (
    <div
      className="w-full min-h-1/4 rounded-box items-center bg-base-200 p-4 flex flex-col flex-grow-1 gap-y-2 justify-start"
      style={{ height: "calc(100% - 2rem)" }}
    >
      <div className="w-full max-h-full bg-base-200 rounded overflow-auto">
        <table className="w-full table table-fixed table-pin-cols">
          <thead className="sticky top-0 z-10 bg-base-100 w-full">
            <tr className="text-base-content">
              <td>
                <p className="text-lg font-medium ps-1">Input</p>
              </td>
              <td className="flex flex-row gap-x-6 items-center">
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
              </td>
            </tr>
          </thead>
          <tbody className="bg-base-100">
            {runLogData?.map((runlog) => {
              return (
                <tr>
                  <td>{JSON.stringify(runlog.inputs)}</td>
                  <td>
                    {showRaw
                      ? runlog.raw_output
                      : JSON.stringify(runlog.parsed_outputs)}
                  </td>
                </tr>
              );
            })}
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
        "bg-base-200 p-4 rounded-full flex justify-center items-center",
        "w-20 h-20 visible cursor-pointer",
        "transition-colors",
        selectedVersionUuid == data.uuid
          ? "border-neutral-content border-2"
          : "border-none",
        data.isPublished
          ? "bg-secondary/80 hover:bg-secondary/50"
          : "bg-base-200 hover:bg-blue-500/30"
      )}
      onClick={() => setSelectedVersionUuid(data.uuid)}
    >
      <Handle type="target" position={Position.Top} />
      <p className="text-base-content font-medium italic">
        V<span className="font-bold text-xl not-italic">{data.label}</span>
      </p>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}
