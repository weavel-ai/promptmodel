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
import { PencilSimple, Plus } from "@phosphor-icons/react";
import { useChatModel } from "@/hooks/useChatModel";
import { ModelNode } from "@/components/nodes/ModelNode";
import { GroupNode } from "@/components/nodes/GroupNode";
import { useWindowSize } from "@react-hook/window-size";
import { CreateModelModal } from "@/components/modals/CreateModelModal";
import { useQueryClient } from "@tanstack/react-query";
import { SelectTab } from "@/components/SelectTab";

dayjs.extend(relativeTime);

const NODE_WIDTH = 256;
const NODE_HEIGHT = 144;
const NODE_PADDING = 32;

const initialNodes = [];
const initialEdges = [];

enum Tab {
  PROMPT_MODEL = "PromptModel",
  CHAT_MODEL = "ChatModel",
}

const TABS = [Tab.PROMPT_MODEL, Tab.CHAT_MODEL];

export default function Page() {
  const [windowWidth, windowHeight] = useWindowSize();
  const [nodes, setNodes] = useState(initialNodes);
  const [edges, setEdges] = useState(initialEdges);
  const { chatModelListData } = useChatModel();
  const { promptModelListData } = usePromptModel();
  const [showCreateModelModal, setShowCreateModelModal] = useState(false);
  const [selectedTab, setSelectedTab] = useState(Tab.PROMPT_MODEL);
  const queryClient = useQueryClient();

  const nodeTypes = useMemo(
    () => ({ model: ModelNode, groupLabel: GroupNode }),
    []
  );

  // Build nodes
  useEffect(() => {
    if (selectedTab === Tab.PROMPT_MODEL && !promptModelListData) return;
    if (selectedTab === Tab.CHAT_MODEL && !chatModelListData) return;

    // Calculations
    const totalNodes =
      selectedTab === Tab.PROMPT_MODEL
        ? promptModelListData.length
        : chatModelListData.length;

    let maxNodesPerRow = Math.floor(
      (windowWidth - NODE_PADDING) / (NODE_WIDTH + NODE_PADDING)
    );
    maxNodesPerRow = Math.min(maxNodesPerRow, totalNodes);
    const numRows = Math.ceil(totalNodes / maxNodesPerRow);
    const totalHeight = numRows * NODE_HEIGHT + (numRows - 1) * NODE_PADDING;
    const topPadding = (windowHeight - totalHeight) / 2;

    const modelListData =
      selectedTab === Tab.PROMPT_MODEL
        ? promptModelListData
        : chatModelListData;
    const newNodes = modelListData.map((model, index) => {
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
        position: { x, y },
        data: {
          label: model.name,
          name: model.name,
          uuid: model.uuid,
          created_at: model.created_at,
          type: selectedTab,
        },
      };
    });

    setNodes(newNodes);
  }, [selectedTab, promptModelListData, chatModelListData]);

  function handleModelCreated() {
    queryClient.invalidateQueries({
      predicate: (query) =>
        query.queryKey[0] === "modelListData" &&
        query.queryKey[1]["type"] === selectedTab,
    });
  }

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
        <div className="fixed top-16 left-24 z-50">
          <SelectTab
            tabs={TABS}
            selectedTab={selectedTab}
            onSelect={(newTab) => setSelectedTab(newTab as Tab)}
          />
        </div>
        <CreateNewButton onClick={() => setShowCreateModelModal(true)} />
        <CreateModelModal
          isOpen={showCreateModelModal}
          setIsOpen={setShowCreateModelModal}
          type={selectedTab}
          onCreated={handleModelCreated}
        />
      </ReactFlow>
    </div>
  );
}

function CreateNewButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      className={classNames(
        "fixed top-16 right-6 flex flex-row gap-x-2 items-center backdrop-blur-sm z-50",
        "btn btn-outline btn-sm normal-case font-normal h-10 border-[1px] border-neutral-content hover:bg-neutral-content/20"
      )}
      onClick={onClick}
    >
      <Plus className="text-secondary" size={20} weight="fill" />
      <p className="text-base-content">Create new</p>
    </button>
  );
}
