"use client";
import { usePromptModel } from "@/hooks/usePromptModel";
import classNames from "classnames";
import {
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import dayjs from "dayjs";
import ReactFlow, { Background, BackgroundVariant } from "reactflow";

import "reactflow/dist/style.css";
import relativeTime from "dayjs/plugin/relativeTime";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { PencilSimple, Plus, Trash } from "@phosphor-icons/react";
import { useChatModel } from "@/hooks/useChatModel";
import { ModelNode } from "@/components/nodes/ModelNode";
import { GroupNode } from "@/components/nodes/GroupNode";
import { useWindowSize } from "@react-hook/window-size";
import { CreateModelModal } from "@/components/modals/CreateModelModal";
import { useQueryClient } from "@tanstack/react-query";
import { SelectTab } from "@/components/SelectTab";
import { ContextMenu, ContextMenuItem } from "@/components/menu/ContextMenu";
import { Modal } from "@/components/modals/Modal";
import { InputField } from "@/components/InputField";
import { toast } from "react-toastify";
import { useSupabaseClient } from "@/apis/supabase";
import { deleteChatModel, editChatModel } from "@/apis/chat_models";
import { deletePromptModel, editPromptModel } from "@/apis/prompt_models";

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
  const queryClient = useQueryClient();
  const [nodes, setNodes] = useState(initialNodes);
  const [edges, setEdges] = useState(initialEdges);
  const { chatModelListData } = useChatModel();
  const { promptModelListData } = usePromptModel();
  const [showCreateModelModal, setShowCreateModelModal] = useState(false);
  const [selectedTab, setSelectedTab] = useState(Tab.PROMPT_MODEL);
  const [menuData, setMenuData] = useState(null);
  const reactFlowRef = useRef(null);

  const nodeTypes = useMemo(
    () => ({ model: ModelNode, groupLabel: GroupNode }),
    []
  );

  const onNodeContextMenu = useCallback(
    (event, node) => {
      // Prevent native context menu from showing
      event.preventDefault();

      // Calculate position of the context menu. We want to make sure it
      // doesn't get positioned off-screen.
      const pane = reactFlowRef.current.getBoundingClientRect();
      setMenuData({
        id: node.id,
        top: event.clientY < pane.height - 200 && event.clientY,
        left: event.clientX < pane.width - 200 && event.clientX,
        right: event.clientX >= pane.width - 200 && pane.width - event.clientX,
        bottom:
          event.clientY >= pane.height - 200 && pane.height - event.clientY,
      });
    },
    [setMenuData]
  );

  // Close the context menu if it's open whenever the window is clicked.
  const onPaneClick = useCallback(() => setMenuData(null), [setMenuData]);

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
          online: model.online,
        },
      };
    });

    setNodes(newNodes);
  }, [
    selectedTab,
    promptModelListData,
    chatModelListData,
    windowHeight,
    windowWidth,
  ]);

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
        ref={reactFlowRef}
        nodesDraggable={false}
        nodeTypes={nodeTypes}
        nodes={nodes}
        edges={edges}
        proOptions={{ hideAttribution: true }}
        onPaneClick={onPaneClick}
        onNodeContextMenu={onNodeContextMenu}
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
      {menuData && (
        <ModelContextMenu
          onPaneClick={onPaneClick}
          menuData={menuData}
          setMenuData={setMenuData}
          modelType={selectedTab}
        />
      )}
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

function ModelContextMenu({ onPaneClick, menuData, setMenuData, modelType }) {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  return (
    <>
      <ContextMenu onClick={onPaneClick} menuData={menuData}>
        {
          (
            <ContextMenuItem
              icon={
                (
                  <PencilSimple className="text-secondary" size={20} />
                ) as ReactNode
              }
              label="Edit"
              onClick={() => {
                setIsEditModalOpen(true);
                // onPaneClick();
              }}
            />
          ) as ReactNode
        }
        {
          (
            <ContextMenuItem
              icon={(<Trash className="text-red-500" size={20} />) as ReactNode}
              label="Delete"
              onClick={() => {
                setIsDeleteModalOpen(true);
                // onPaneClick();
              }}
            />
          ) as ReactNode
        }
      </ContextMenu>
      <EditModelNameModal
        isOpen={isEditModalOpen}
        setIsOpen={setIsEditModalOpen}
        setMenuData={setMenuData}
        modelType={modelType}
        modelUuid={menuData.id}
      />
      <DeleteModelModal
        isOpen={isDeleteModalOpen}
        setIsOpen={setIsDeleteModalOpen}
        setMenuData={setMenuData}
        modelType={modelType}
        modelUuid={menuData.id}
      />
    </>
  );
}

function EditModelNameModal({
  isOpen,
  setIsOpen,
  setMenuData,
  modelType,
  modelUuid,
}) {
  const { supabase } = useSupabaseClient();
  const { promptModelListData } = usePromptModel();
  const { chatModelListData } = useChatModel();

  const previousName = useMemo(() => {
    if (modelType === Tab.PROMPT_MODEL) {
      const model = promptModelListData.find(
        (model) => model?.uuid === modelUuid
      );
      return model.name;
    } else if (modelType == Tab.CHAT_MODEL) {
      const model = chatModelListData.find((model) => model.uuid === modelUuid);
      return model?.name;
    }
  }, [modelType, modelUuid, promptModelListData, chatModelListData]);

  const [name, setName] = useState(previousName);

  useEffect(() => {
    setName(previousName);
  }, [previousName, setName]);

  const isDisabled = useMemo(() => {
    if (name?.length === 0) return true;
    if (name === previousName) return true;
  }, [name, previousName]);

  async function handleSaveName() {
    const toastId = toast.loading("Saving...");
    if (modelType === Tab.PROMPT_MODEL) {
      await editPromptModel({
        uuid: modelUuid,
        name: name,
      });
    } else {
      await editChatModel({
        uuid: modelUuid,
        name: name,
      });
    }
    setIsOpen(false);
    setMenuData(null);
    toast.update(toastId, {
      containerId: "default",
      render: "Saved!",
      type: "success",
      isLoading: false,
      autoClose: 1000,
    });
  }

  return (
    <Modal isOpen={isOpen} setIsOpen={setIsOpen}>
      <div className="bg-popover p-6 rounded-box flex flex-col gap-y-4 items-start">
        <p className="text-base-content text-xl font-semibold">
          Edit {modelType} name
        </p>
        <InputField label={`Name`} value={name} setValue={setName} />
        <div className="flex flex-row w-full justify-end">
          <button
            className={classNames(
              "flex flex-row gap-x-2 items-center btn btn-outline btn-sm normal-case font-normal h-10 bg-base-content hover:bg-base-content/80",
              "disabled:bg-neutral-content"
            )}
            onClick={handleSaveName}
            disabled={isDisabled}
          >
            <p className="text-base-100">Save</p>
          </button>
        </div>
      </div>
    </Modal>
  );
}

function DeleteModelModal({
  isOpen,
  setIsOpen,
  setMenuData,
  modelType,
  modelUuid,
}) {
  const { supabase } = useSupabaseClient();
  const { promptModelListData } = usePromptModel();
  const { chatModelListData } = useChatModel();

  const model = useMemo(() => {
    if (modelType === Tab.PROMPT_MODEL) {
      return promptModelListData.find((model) => model.uuid === modelUuid);
    } else if (modelType === Tab.CHAT_MODEL) {
      return chatModelListData.find((model) => model.uuid === modelUuid);
    }
  }, [modelUuid, promptModelListData, chatModelListData, modelType]);

  async function handleDeleteModel() {
    const toastId = toast.loading("Deleting...");
    if (modelType === Tab.PROMPT_MODEL) {
      await deletePromptModel({
        uuid: modelUuid,
      });
    } else if (modelType === Tab.CHAT_MODEL) {
      await deleteChatModel({
        uuid: modelUuid,
      });
    }
    setIsOpen(false);
    setMenuData(null);
    toast.update(toastId, {
      containerId: "default",
      render: "Deleted!",
      type: "success",
      isLoading: false,
      autoClose: 1000,
    });
  }

  return (
    <Modal isOpen={isOpen} setIsOpen={setIsOpen}>
      <div className="bg-popover p-6 rounded-box flex flex-col gap-y-4 items-start">
        <p className="text-base-content text-xl font-semibold">
          Delete {modelType}
        </p>
        <p className="text-base-content">
          Are you sure you want to delete {modelType}{" "}
          <span className="font-semibold">{model?.name}</span>? This action
          cannot be undone.
        </p>
        <div className="flex flex-row w-full justify-end">
          <button
            className={classNames(
              "flex flex-row gap-x-2 items-center btn btn-sm normal-case font-normal h-10 bg-red-500 hover:bg-red-500/80",
              "disabled:bg-neutral-content outline-none active:outline-none focus:outline-none"
            )}
            onClick={handleDeleteModel}
          >
            <p className="text-base-content">Delete</p>
          </button>
        </div>
      </div>
    </Modal>
  );
}
