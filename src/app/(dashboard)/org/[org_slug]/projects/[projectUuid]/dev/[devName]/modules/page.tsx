"use client";
import { Module } from "@/apis/module";
import { useModule } from "@/hooks/dev/useModule";
import classNames from "classnames";
import { useCallback, useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import ReactFlow, {
  Background,
  BackgroundVariant,
  addEdge,
  useEdgesState,
  useNodesState,
} from "reactflow";

import "reactflow/dist/style.css";
import relativeTime from "dayjs/plugin/relativeTime";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { nightOwl } from "react-syntax-highlighter/dist/esm/styles/prism";
import { toast } from "react-toastify";
import { useSupabaseClient } from "@/apis/base";
import { subscribeDevBranchStatus, updateDevBranchSync } from "@/apis/dev";
import { useDevBranch } from "@/hooks/useDevBranch";
import { Plus } from "@phosphor-icons/react";
import { CreateModelModal } from "@/components/modals/CreateModelModal";

dayjs.extend(relativeTime);

const NODE_WIDTH = 256;
const NODE_HEIGHT = 144;
const NODE_PADDING = 32;

const initialNodes = [];
const initialEdges = [];

const SAMPLE_CODE = `# main.py

from promptmodel import Client, PromptModel

client = Client()

# You can simply fetch prompts
extract_keyword_prompts = PromptModel("extract_keyword").get_prompts()

# Or use PromptModel's methods for LLM calls
@client.register # This is required to display the promptmodel on the development dashboard
def test():
    response = PromptModel("gen_story").run()
    print(response)`;

export default function Page() {
  const params = useParams();
  const [nodes, setNodes] = useState(initialNodes);
  const [edges, setEdges] = useState(initialEdges);
  const { createSupabaseClient } = useSupabaseClient();
  const { moduleListData, refetchModuleListData } = useModule();
  const { devBranchData } = useDevBranch();
  const [showCreateModel, setShowCreateModel] = useState(false);

  const nodeTypes = useMemo(
    () => ({ module: ModuleNode, groupLabel: GroupNode }),
    []
  );

  // Build nodes
  useEffect(() => {
    if (!moduleListData || moduleListData?.length == 0) return;
    const totalNodes = moduleListData.length;
    const windowHeight = window.innerHeight;
    const windowWidth = window.innerWidth;
    let maxNodesPerRow = Math.floor(
      (windowWidth - NODE_PADDING) / (NODE_WIDTH + NODE_PADDING)
    );
    maxNodesPerRow = Math.min(maxNodesPerRow, totalNodes); // Ensure maxNodesPerRow is not greater than totalNodes
    const numRows = Math.ceil(totalNodes / maxNodesPerRow);
    const totalHeight = numRows * NODE_HEIGHT + (numRows - 1) * NODE_PADDING;
    const topPadding = (windowHeight - totalHeight) / 2;
    const newNodes: any[] = [
      {
        id: "Promptmodels",
        type: "groupLabel",
        position: {
          x:
            (windowWidth -
              NODE_WIDTH * maxNodesPerRow -
              NODE_PADDING * (maxNodesPerRow - 1)) /
              2 -
            28,
          y: topPadding - 80,
        },
        style: {
          width:
            NODE_WIDTH * maxNodesPerRow +
            NODE_PADDING * (maxNodesPerRow - 1) +
            56,
          height: totalHeight + 30 + 80,
        },
        data: {
          label: "PromptModels",
        },
      },
    ];
    newNodes.push(
      ...moduleListData.map((module, index) => {
        // Set node position
        const row = Math.floor(index / maxNodesPerRow);
        const col = index % maxNodesPerRow;
        const x =
          (windowWidth -
            NODE_WIDTH * maxNodesPerRow -
            NODE_PADDING * (maxNodesPerRow - 1)) /
            2 +
          col * (NODE_WIDTH + NODE_PADDING);
        const y = topPadding + row * (NODE_HEIGHT + NODE_PADDING);

        return {
          id: module.uuid,
          type: "module",
          position: { x: x, y: y },
          data: {
            label: module.name,
            name: module.name,
            uuid: module.uuid,
            created_at: module.created_at,
          },
        };
      })
    );
    setNodes(newNodes);
  }, [moduleListData]);

  // Subscribe dev branch sync status
  useEffect(() => {
    if (!params?.projectUuid || !params?.devName || !devBranchData) return;
    if (devBranchData?.cloud) return;
    let devBranchStream;
    createSupabaseClient().then((client) => {
      devBranchStream = subscribeDevBranchStatus(
        client,
        params?.projectUuid as string,
        params?.devName as string,
        async (data) => {
          console.log(data);
          if (data?.sync == false) {
            const toastId = toast.loading("Syncing...");
            await refetchModuleListData();
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
  }, [devBranchData]);

  return (
    <div className="w-full h-full">
      <ReactFlow
        nodesDraggable={false}
        nodeTypes={nodeTypes}
        nodes={nodes}
        edges={edges}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
        <NoModulesDisplay
          show={!(moduleListData?.length > 0) && devBranchData != null}
        />
        <button
          className={classNames(
            "fixed top-16 right-6 flex flex-row gap-x-2 items-center backdrop-blur-sm z-50",
            "btn btn-outline btn-sm normal-case font-normal h-10 border-[1px] border-neutral-content hover:bg-neutral-content/20"
          )}
          onClick={() => setShowCreateModel(true)}
        >
          <Plus className="text-secondary" size={20} weight="fill" />
          <p className="text-base-content">Create new</p>
        </button>
        <CreateModelModal
          isOpen={showCreateModel}
          setIsOpen={setShowCreateModel}
          onCreated={refetchModuleListData}
        />
      </ReactFlow>
    </div>
  );
}

function ModuleNode({ data }) {
  const pathname = usePathname();
  return (
    <Link
      href={`${pathname}/${data.uuid}`}
      className={classNames(
        "bg-base-200 p-4 rounded-box flex flex-col gap-y-2 justify-start items-start",
        "w-[16rem] h-[9rem] visible",
        "transition-colors hover:bg-base-300"
      )}
    >
      <p className="text-base-content font-bold text-lg">{data.name}</p>
      <p className="text-neutral-content font-medium text-sm">
        {dayjs(data.created_at).fromNow()}
      </p>
    </Link>
  );
}

function GroupNode({ data }) {
  return (
    <div
      className={classNames(
        "bg-base-100/5 rounded-box flex flex-col gap-y-2 justify-start items-start w-full h-full",
        "border-2 border-base-content/50 p-0 pointer-events-none"
      )}
    >
      <p className="text-base-content font-bold text-2xl p-4">{data.label}</p>
    </div>
  );
}

function NoModulesDisplay({ show }: { show: boolean }) {
  const { devBranchData } = useDevBranch();

  if (!show) return null;
  if (devBranchData?.cloud == true) {
    return (
      <div className="fixed inset-0 m-auto w-fit h-fit z-50">
        <p className="text-lg font-semibold text-center">
          You don't have any PromptModels or ChatModels yet.
          <br />
          Create one to get started!
        </p>
      </div>
    );
  }
  return (
    <div className="fixed inset-0 flex justify-center items-center z-50">
      <div className="bg-base-200 rounded-box w-fit min-w-[30rem] h-fit p-8 flex flex-col justify-between gap-y-7">
        <p className="text-2xl font-bold text-base-content">
          Create a new PromptModel
        </p>
        <p className="text-base-content">
          The code below will generate two PromptModels: <i>extract_keyword</i>{" "}
          and <i>gen_story</i>.
          <br />
          Copy and modify the code to get started in a blink!
        </p>
        <div
          className="tooltip tooltip-bottom tooltip-secondary"
          data-tip="Click to copy!"
        >
          <SyntaxHighlighter
            language="python"
            style={nightOwl}
            className="cursor-copy"
            onClick={() => {
              navigator.clipboard.writeText(SAMPLE_CODE);
              toast.success("Copied to clipboard!", {
                autoClose: 2000,
              });
            }}
          >
            {SAMPLE_CODE}
          </SyntaxHighlighter>
        </div>
      </div>
    </div>
  );
}
