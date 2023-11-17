"use client";

import { Warning } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { useParams, usePathname, useRouter } from "next/navigation";
import { PromptModel } from "@/apis/promptModel";
import { usePromptModel } from "@/hooks/dev/usePromptModel";
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
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { nightOwl } from "react-syntax-highlighter/dist/esm/styles/prism";
import { toast } from "react-toastify";
import { useSupabaseClient } from "@/apis/base";
import {
  fetchDevBranch,
  subscribeDevBranchStatus,
  updateDevBranchSync,
} from "@/apis/dev";
import { useDevBranch } from "@/hooks/useDevBranch";
import { Plus } from "@phosphor-icons/react";
import { CreateModelModal } from "@/components/modals/CreateModelModal";
import { useChatModel } from "@/hooks/dev/useChatModel";
import { ModelNode } from "@/components/nodes/ModelNode";
import { GroupNode } from "@/components/nodes/GroupNode";
import { useWindowSize } from "@react-hook/window-size";

dayjs.extend(relativeTime);

const NODE_WIDTH = 256;
const NODE_HEIGHT = 144;
const NODE_PADDING = 32;

const initialNodes = [];
const initialEdges = [];

// # You can simply fetch prompts
// extract_keyword_prompts = PromptModel("gen_story").get_prompts()

// # Or use PromptModel's methods for LLM calls

const SAMPLE_CODE = `# main.py

from promptmodel import DevClient, PromptModel

client = DevClient()

@client.register # This is required to display the promptmodel on the development dashboard
def gen_story():
    response = PromptModel("gen_story").run()
    print(response)`;

enum BranchStatus {
  ONLINE,
  OFFLINE,
  NOT_FOUND,
  LOADING,
}

const MAX_REFETCH_COUNT = 20;

export default function Page() {
  const params = useParams();
  const router = useRouter();
  const pathname = usePathname();
  const [nodes, setNodes] = useState(initialNodes);
  const [edges, setEdges] = useState(initialEdges);
  const { createSupabaseClient } = useSupabaseClient();
  const [status, setStatus] = useState<BranchStatus>(BranchStatus.LOADING);
  const [refetchCount, setRefetchCount] = useState<number>(0);
  const [windowWidth, windowHeight] = useWindowSize();

  const { promptModelListData, refetchPromptModelListData } = usePromptModel();
  const { chatModelListData, refetchChatModelListData } = useChatModel();
  const { devBranchData } = useDevBranch();
  const [showCreateModel, setShowCreateModel] = useState(false);

  const nodeTypes = useMemo(
    () => ({ model: ModelNode, groupLabel: GroupNode }),
    []
  );

  const { data } = useQuery({
    queryKey: ["devBranch", params?.devName as string],
    queryFn: async () =>
      await fetchDevBranch(
        await createSupabaseClient(),
        params?.projectUuid as string,
        params?.devName as string
      ),
    onSettled: (data) => {
      setRefetchCount(refetchCount + 1);
    },
    onSuccess: (data) => {
      if (data && data?.length > 0) {
        if (data[0].online || data[0].cloud) {
          setStatus(BranchStatus.ONLINE);
          // router.push(pathname + "/prompt_models");
        } else {
          setStatus(BranchStatus.OFFLINE);
        }
      } else {
        setStatus(BranchStatus.NOT_FOUND);
      }
    },
    refetchInterval:
      status == BranchStatus.OFFLINE || refetchCount < MAX_REFETCH_COUNT
        ? 1000
        : false,
  });

  // // Build nodes
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
            await refetchPromptModelListData();
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

  if (status == BranchStatus.NOT_FOUND) {
    return (
      <div className="w-full h-full flex flex-col gap-y-8 justify-center items-center">
        <Warning size={48} className="text-base-content" />
        <p className="text-lg">
          Development branch
          <strong>&nbsp;{params?.devName}&nbsp;</strong>
          wasn&apos;t found.
        </p>
      </div>
    );
  }

  if (status == BranchStatus.OFFLINE) {
    return (
      <div className="w-full h-full flex flex-col gap-y-8 justify-center items-center">
        <Warning size={48} className="text-base-content" />
        <p className="text-lg">
          Development branch
          <strong>&nbsp;{params?.devName}&nbsp;</strong>
          is offline.
        </p>
      </div>
    );
  }

  if (status == BranchStatus.ONLINE) {
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
          <NoModelsDisplay
            show={!(promptModelListData?.length > 0) && devBranchData != null}
          />
          <button
            className={classNames(
              "fixed top-16 right-6 flex flex-row gap-x-2 items-center backdrop-blur-sm z-50",
              "btn btn-outline btn-sm normal-case font-normal h-10 border-[1px] border-neutral-content hover:bg-neutral-content/20",
              !devBranchData?.cloud && "hidden"
            )}
            onClick={() => setShowCreateModel(true)}
          >
            <Plus className="text-secondary" size={20} weight="fill" />
            <p className="text-base-content">Create new</p>
          </button>
          {devBranchData?.cloud && (
            <CreateModelModal
              isOpen={showCreateModel}
              setIsOpen={setShowCreateModel}
              onCreated={refetchPromptModelListData}
            />
          )}
        </ReactFlow>
      </div>
    );
  }

  return <div className="loading loading-ring" />;
}

function NoModelsDisplay({ show }: { show: boolean }) {
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
          The code below will display a PromptModel <i>gen_story</i> on the
          dashboard.
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
