"use client";
import { usePromptModel } from "@/hooks/usePromptModel";
import classNames from "classnames";
import { useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import ReactFlow, { Background, BackgroundVariant } from "reactflow";

import "reactflow/dist/style.css";
import relativeTime from "dayjs/plugin/relativeTime";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { PencilSimple } from "@phosphor-icons/react";
import { CreateDevModal } from "@/components/modals/CreateDevModal";

dayjs.extend(relativeTime);

const NODE_WIDTH = 256;
const NODE_HEIGHT = 144;
const NODE_PADDING = 32;

const initialNodes = [];
const initialEdges = [];

export default function Page() {
  const [nodes, setNodes] = useState(initialNodes);
  const [edges, setEdges] = useState(initialEdges);
  const { promptModelListData } = usePromptModel();
  const [showCreateDevModal, setShowCreateDevModal] = useState(false);

  const nodeTypes = useMemo(
    () => ({ model: ModelNode, groupLabel: GroupNode }),
    []
  );

  // Build nodes
  useEffect(() => {
    if (!promptModelListData || promptModelListData?.length == 0) return;
    const totalNodes = promptModelListData.length;
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
      ...promptModelListData.map((model, index) => {
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
          id: model.uuid,
          type: "model",
          position: { x: x, y: y },
          data: {
            label: model.name,
            name: model.name,
            uuid: model.uuid,
            created_at: model.created_at,
          },
        };
      })
    );
    setNodes(newNodes);
  }, [promptModelListData]);

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
        <button
          className={classNames(
            "fixed top-16 right-10 flex flex-row gap-x-2 items-center backdrop-blur-sm z-50",
            "btn btn-outline btn-sm normal-case font-normal h-10 border-[1px] border-neutral-content hover:bg-neutral-content/20"
          )}
          onClick={() => setShowCreateDevModal(true)}
        >
          <PencilSimple className="text-secondary" size={20} weight="fill" />
          <p className="text-base-content">Develop</p>
        </button>
      </ReactFlow>
      <CreateDevModal
        isOpen={showCreateDevModal}
        setIsOpen={setShowCreateDevModal}
      />
    </div>
  );
}

function ModelNode({ data }) {
  const pathname = usePathname();
  return (
    <Link
      href={`${pathname}/prompt_models/${data.uuid}`}
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
