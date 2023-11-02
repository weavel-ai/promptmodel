"use client";
import { useModule } from "@/hooks/useModule";
import classNames from "classnames";
import { useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import ReactFlow, { Background, BackgroundVariant } from "reactflow";

import "reactflow/dist/style.css";
import relativeTime from "dayjs/plugin/relativeTime";
import Link from "next/link";
import { usePathname } from "next/navigation";

dayjs.extend(relativeTime);

const NODE_WIDTH = 256;
const NODE_HEIGHT = 144;
const NODE_PADDING = 32;

const initialNodes = [];
const initialEdges = [];

export default function Page() {
  const [nodes, setNodes] = useState(initialNodes);
  const [edges, setEdges] = useState(initialEdges);
  const { moduleListData } = useModule();

  const nodeTypes = useMemo(() => ({ module: ModuleNode }), []);

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
    const newNodes = moduleListData.map((module, index) => {
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
        dragging: true,
        data: {
          label: module.name,
          name: module.name,
          uuid: module.uuid,
          created_at: module.created_at,
        },
      };
    });
    setNodes(newNodes);
  }, [moduleListData]);

  return (
    <div className="w-full h-full">
      <p className="text-3xl font-semibold absolute top-16 left-24 z-10">
        Promptmodels
      </p>
      <ReactFlow
        nodeTypes={nodeTypes}
        nodes={nodes}
        edges={edges}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
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
