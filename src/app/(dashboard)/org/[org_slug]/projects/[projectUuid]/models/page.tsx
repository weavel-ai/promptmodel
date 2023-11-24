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
import { CreateDevModal } from "@/components/modals/CreateDevModal";
import { useChatModel } from "@/hooks/useChatModel";
import { ModelNode } from "@/components/nodes/ModelNode";
import { GroupNode } from "@/components/nodes/GroupNode";
import { useWindowSize } from "@react-hook/window-size";
import { CreateModelModal } from "@/components/modals/CreateModelModal";
import { useQueryClient } from "@tanstack/react-query";

dayjs.extend(relativeTime);

const NODE_WIDTH = 256;
const NODE_HEIGHT = 144;
const NODE_PADDING = 32;

const initialNodes = [];
const initialEdges = [];

export default function Page() {
  const [windowWidth, windowHeight] = useWindowSize();
  const [nodes, setNodes] = useState(initialNodes);
  const [edges, setEdges] = useState(initialEdges);
  const { chatModelListData } = useChatModel();
  const { promptModelListData } = usePromptModel();
  const [showCreateModelModal, setShowCreateModelModal] = useState(false);
  const queryClient = useQueryClient();

  const nodeTypes = useMemo(
    () => ({ model: ModelNode, groupLabel: GroupNode }),
    []
  );

  // Build nodes
  useEffect(() => {
    if (!promptModelListData || !chatModelListData) return;

    // Calculations for PromptModel
    const promptModelTotalNodes = promptModelListData.length;
    let maxPromptNodesPerRow = Math.floor(
      (windowWidth - NODE_PADDING) / (NODE_WIDTH + NODE_PADDING)
    );
    maxPromptNodesPerRow = Math.min(
      maxPromptNodesPerRow,
      promptModelTotalNodes
    );
    const promptNumRows = Math.ceil(
      promptModelTotalNodes / maxPromptNodesPerRow
    );
    const promptTotalHeight =
      promptNumRows * NODE_HEIGHT + (promptNumRows - 1) * NODE_PADDING;
    const promptTopPadding = (windowHeight - promptTotalHeight) / 2;

    // Calculations for ChatModel
    const chatModelTotalNodes = chatModelListData.length;
    let maxChatNodesPerRow = Math.floor(
      (windowWidth - NODE_PADDING) / (NODE_WIDTH + NODE_PADDING)
    );
    maxChatNodesPerRow = Math.min(maxChatNodesPerRow, chatModelTotalNodes);
    const chatNumRows = Math.ceil(chatModelTotalNodes / maxChatNodesPerRow);
    const chatTotalHeight =
      chatNumRows * NODE_HEIGHT + (chatNumRows - 1) * NODE_PADDING;
    const chatTopPadding = promptTopPadding + promptTotalHeight + 30 + 80 + 20; // Adjust the spacing between two groups

    // Initialize nodes array
    const newNodes = [];

    if (promptModelListData.length > 0) {
      // Add group for PromptModels
      newNodes.push({
        id: "PromptModels",
        type: "groupLabel",
        position: {
          x:
            (windowWidth -
              NODE_WIDTH * maxPromptNodesPerRow -
              NODE_PADDING * (maxPromptNodesPerRow - 1)) /
              2 -
            28,
          y: promptTopPadding - 80,
        },
        style: {
          width:
            NODE_WIDTH * maxPromptNodesPerRow +
            NODE_PADDING * (maxPromptNodesPerRow - 1) +
            56,
          height: promptTotalHeight + 30 + 80,
        },
        data: {
          label: "PromptModels",
        },
      });

      // Add PromptModel nodes
      newNodes.push(
        ...promptModelListData.map((model, index) => {
          const row = Math.floor(index / maxPromptNodesPerRow);
          const col = index % maxPromptNodesPerRow;
          const x =
            (windowWidth -
              NODE_WIDTH * maxPromptNodesPerRow -
              NODE_PADDING * (maxPromptNodesPerRow - 1)) /
              2 +
            col * (NODE_WIDTH + NODE_PADDING);
          const y = promptTopPadding + row * (NODE_HEIGHT + NODE_PADDING);

          return {
            id: model.uuid,
            type: "model",
            position: { x, y },
            data: {
              label: model.name,
              name: model.name,
              uuid: model.uuid,
              created_at: model.created_at,
              type: "PromptModel",
            },
          };
        })
      );
    }

    if (chatModelListData.length > 0) {
      // Add group for ChatModels
      newNodes.push({
        id: "ChatModels",
        type: "groupLabel",
        position: {
          x:
            (windowWidth -
              NODE_WIDTH * maxChatNodesPerRow -
              NODE_PADDING * (maxChatNodesPerRow - 1)) /
              2 -
            28,
          y: chatTopPadding - 80,
        },
        style: {
          width:
            NODE_WIDTH * maxChatNodesPerRow +
            NODE_PADDING * (maxChatNodesPerRow - 1) +
            56,
          height: chatTotalHeight + 30 + 80,
        },
        data: {
          label: "ChatModels",
        },
      });

      // Add ChatModel nodes
      newNodes.push(
        ...chatModelListData.map((model, index) => {
          const row = Math.floor(index / maxChatNodesPerRow);
          const col = index % maxChatNodesPerRow;
          const x =
            (windowWidth -
              NODE_WIDTH * maxChatNodesPerRow -
              NODE_PADDING * (maxChatNodesPerRow - 1)) /
              2 +
            col * (NODE_WIDTH + NODE_PADDING);
          const y = chatTopPadding + row * (NODE_HEIGHT + NODE_PADDING);

          return {
            id: model.uuid,
            type: "model",
            position: { x, y },
            data: {
              label: model.name,
              name: model.name,
              uuid: model.uuid,
              created_at: model.created_at,
              type: "ChatModel",
            },
          };
        })
      );
    }

    setNodes(newNodes);
  }, [promptModelListData, chatModelListData]);

  function handleModelCreated() {
    queryClient.invalidateQueries({
      predicate: (query) => query.queryKey[0] === "modelListData",
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
        <CreateNewButton onClick={() => setShowCreateModelModal(true)} />
        <CreateModelModal
          isOpen={showCreateModelModal}
          setIsOpen={setShowCreateModelModal}
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
