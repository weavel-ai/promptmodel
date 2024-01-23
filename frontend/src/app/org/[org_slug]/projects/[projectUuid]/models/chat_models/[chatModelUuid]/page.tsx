"use client";

import { Drawer } from "@/components/Drawer";
import classNames from "classnames";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactFlow, {
  Background,
  BackgroundVariant,
  Handle,
  Position,
} from "reactflow";
import { motion } from "framer-motion";
import { GitBranch, RocketLaunch, XCircle } from "@phosphor-icons/react";
import { toast } from "react-toastify";
import "reactflow/dist/style.css";
import { editor } from "monaco-editor";
import { useHotkeys } from "react-hotkeys-hook";
import { tree, stratify } from "d3-hierarchy";
import { useQueryClient } from "@tanstack/react-query";
import { ResizableSeparator } from "@/components/ResizableSeparator";
import { useProject } from "@/hooks/useProject";
import { SelectTab } from "@/components/SelectTab";
import { useDailyChatLogMetrics } from "@/hooks/analytics";
import { CustomAreaChart } from "@/components/charts/CustomAreaChart";
import { DatePickerWithRange } from "@/components/ui/DatePickerWithRange";
import { DateRange } from "react-day-picker";
import { subDays } from "date-fns";
import dayjs from "dayjs";
import { Badge } from "@/components/ui/badge";
import {
  PromptDiffEditor,
  PromptEditor,
} from "@/components/editor/PromptEditor";
import { useChatModelVersion } from "@/hooks/useChatModelVersion";
import { useChatModelVersionStore } from "@/stores/chatModelVersionStore";
import { useChatModelVersionDetails } from "@/hooks/useChatModelVersionDetails";
import { ModelDisplay, ModelSelector } from "@/components/ModelSelector";
import { ChatUI } from "@/components/ChatUI";
import { useWindowHeight, useWindowSize } from "@react-hook/window-size";
import { FunctionSelector } from "@/components/select/FunctionSelector";
import { useChatModel } from "@/hooks/useChatModel";
import { Monaco, MonacoDiffEditor } from "@monaco-editor/react";
import { arePrimitiveListsEqual, cloneDeep, countStretchNodes } from "@/utils";
import { ClickToEditInput } from "@/components/inputs/ClickToEditInput";
import { VersionTag } from "@/components/VersionTag";
import { TagsSelector } from "@/components/select/TagsSelector";
import {
  updateChatModelVersionMemo,
  updatePublishedChatModelVersion,
} from "@/apis/chat_model_versions";

const initialNodes = [];
const initialEdges = [];

enum Tab {
  Analytics = "Analytics",
  Versions = "Versions",
}

const TABS = [Tab.Analytics, Tab.Versions];

export default function Page() {
  const [tab, setTab] = useState(Tab.Versions);
  const { chatModelVersionListData } = useChatModelVersion();
  const { isCreateVariantOpen } = useChatModelVersionStore();
  return (
    <div className="w-full h-full">
      {chatModelVersionListData?.length > 0 && !isCreateVariantOpen && (
        <div className="fixed top-16 left-24 z-40">
          <SelectTab
            tabs={TABS}
            selectedTab={tab}
            onSelect={(newTab) => setTab(newTab as Tab)}
          />
        </div>
      )}
      {tab == Tab.Analytics && <AnalyticsPage />}
      {tab == Tab.Versions && <VersionsPage />}
    </div>
  );
}

// Analytics Tab Page
const AnalyticsPage = () => {
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(Date.now(), 7),
    to: new Date(),
  });

  const { dailyChatLogMetrics } = useDailyChatLogMetrics(
    dayjs(dateRange?.from)?.toISOString(),
    dayjs(dateRange?.to)?.toISOString()
  );

  const totalCost = dailyChatLogMetrics?.reduce(
    (acc, curr) => acc + curr.total_cost,
    0
  );

  const totalLatency = dailyChatLogMetrics?.reduce(
    (acc, curr) => acc + curr.avg_latency * curr.total_chat_sessions,
    0
  );

  const totalChatSessions = dailyChatLogMetrics?.reduce(
    (acc, curr) => acc + curr.total_chat_sessions,
    0
  );

  const totalTokens = dailyChatLogMetrics?.reduce(
    (acc, curr) => acc + curr.total_token_usage,
    0
  );

  const avgLatency =
    totalChatSessions != 0 ? totalLatency / totalChatSessions : 0;

  function formatDate(inputDate: Date): string {
    const year = inputDate.getFullYear();
    const month = (inputDate.getMonth() + 1).toString().padStart(2, "0");
    const day = inputDate.getDate().toString().padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  let date = new Date(dateRange?.from);
  const existingDates = dailyChatLogMetrics?.map((metric) => metric.day);

  while (date <= dateRange?.to) {
    if (!existingDates?.includes(formatDate(date))) {
      dailyChatLogMetrics?.push({
        day: formatDate(date),
        avg_latency: 0,
        total_cost: 0,
        total_chat_sessions: 0,
        total_token_usage: 0,
      });
    }
    date.setDate(date.getDate() + 1);
  }

  dailyChatLogMetrics?.sort((a, b) => {
    if (a.day < b.day) return -1;
    if (a.day > b.day) return 1;
    return 0;
  });

  return (
    <div className="pt-28 pl-24 flex flex-wrap gap-4 items-center justify-center">
      <div className="absolute right-10 top-14">
        <DatePickerWithRange
          dateRange={dateRange}
          setDateRange={setDateRange}
        />
      </div>
      <CustomAreaChart
        data={dailyChatLogMetrics}
        dataKey="total_cost"
        xAxisDataKey="day"
        title="Total Cost"
        mainData={`$${totalCost}`}
      />
      <CustomAreaChart
        data={dailyChatLogMetrics}
        dataKey="avg_latency"
        xAxisDataKey="day"
        title="Average Latency"
        mainData={`${avgLatency?.toFixed(2)}s`}
      />
      <CustomAreaChart
        data={dailyChatLogMetrics}
        dataKey="total_chat_sessions"
        xAxisDataKey="day"
        title="Total Chat Sessions"
        mainData={totalChatSessions}
      />
      <CustomAreaChart
        data={dailyChatLogMetrics}
        dataKey="total_token_usage"
        xAxisDataKey="day"
        title="Token usage"
        mainData={totalTokens}
      />
    </div>
  );
};

// Versions Tab Page
const VersionsPage = () => {
  const { chatModelVersionListData, refetchChatModelVersionListData } =
    useChatModelVersion();
  const [nodes, setNodes] = useState(initialNodes);
  const [edges, setEdges] = useState(initialEdges);
  const [hoveredVersionData, setHoveredVersionData] = useState(null);

  const {
    isCreateVariantOpen,
    selectedChatModelVersion,
    setSelectedChatModelVersion,
    setOriginalVersionData,
  } = useChatModelVersionStore();
  const nodeTypes = useMemo(() => ({ modelVersion: ModelVersionNode }), []);

  const selectedChatModelVersionUuid = useMemo(() => {
    if (!chatModelVersionListData || !selectedChatModelVersion) return null;
    return chatModelVersionListData.find(
      (v) => v.version == selectedChatModelVersion
    )?.uuid;
  }, [chatModelVersionListData, selectedChatModelVersion]);

  const { chatModelVersionData } = useChatModelVersionDetails(
    selectedChatModelVersionUuid
  );
  const [windowWidth, windowHeight] = useWindowSize();
  const [lowerBoxHeight, setLowerBoxHeight] = useState(240);
  const reactFlowRef = useRef(null);

  useEffect(() => {
    setSelectedChatModelVersion(null);
  }, [setSelectedChatModelVersion]);

  useEffect(() => {
    if (!chatModelVersionData) return;
    setOriginalVersionData(chatModelVersionData);
  }, [chatModelVersionData, setOriginalVersionData]);

  // Build nodes
  useEffect(() => {
    if (!chatModelVersionListData || chatModelVersionListData.length === 0)
      return;

    const generatedEdges = [];
    const dataWithSyntheticRoot = [
      { version: "synthetic-root", from_version: null },
      ...chatModelVersionListData.map((item) => ({
        ...item,
        from_version: item.from_version || "synthetic-root",
      })),
    ];

    const root = stratify()
      .id((d: any) => d.version)
      .parentId((d: any) => d.from_version)(dataWithSyntheticRoot);

    const requiredWidth = countStretchNodes(root) * 160;
    const layout = tree().size([requiredWidth, root.height * 160]);
    const allNodes: any = layout(root).descendants();

    let publishedNodePosition = null;
    allNodes.forEach((node) => {
      // @ts-ignore
      if (node.data.is_published) {
        publishedNodePosition = { x: node.x, y: node.y };
      }
    });

    if (publishedNodePosition) {
      const centerX = windowWidth / 2;
      const centerY = (windowHeight - 48) / 2;
      const offsetX = centerX - publishedNodePosition.x;
      const offsetY = centerY - publishedNodePosition.y;
      allNodes.forEach((node) => {
        node.x += offsetX;
        node.y += offsetY;
      });
    }

    const generatedNodes = allNodes
      // @ts-ignore
      .filter((node) => node.data.version !== "synthetic-root")
      .map((node) => {
        const item = node.data;

        if (item.from_version && item.from_version !== "synthetic-root") {
          generatedEdges.push({
            id: `e${item.version}-${item.from_version}`,
            source: item.from_version.toString(),
            target: item.version.toString(),
          });
        }

        return {
          id: item.version.toString(),
          type: "modelVersion",
          data: {
            label: item.version,
            version: item.version,
            isPublished: item.is_published,
          },
          position: { x: node.x, y: node.y },
        };
      });

    setNodes(generatedNodes);
    setEdges(generatedEdges);
  }, [chatModelVersionListData, windowWidth, windowHeight]);

  const onNodeMouseEnter = useCallback((event, node) => {
    const pane = reactFlowRef.current.getBoundingClientRect();

    if (node?.data?.version) {
      setHoveredVersionData({
        version: node.data.version,
        top: event.clientY < pane.height - 200 && event.clientY,
        left: event.clientX < pane.width - 200 && event.clientX,
        right: event.clientX >= pane.width - 200 && pane.width - event.clientX,
        bottom:
          event.clientY >= pane.height - 200 && pane.height - event.clientY,
      });
    }
  }, []);

  const onNodeMouseLeave = useCallback((event, node) => {
    setHoveredVersionData(null);
  }, []);

  return (
    <>
      <ReactFlow
        ref={reactFlowRef}
        nodeTypes={nodeTypes}
        nodes={nodes}
        edges={edges}
        proOptions={{ hideAttribution: true }}
        defaultViewport={{
          x: -windowWidth / 3 + 80,
          y: -windowHeight / 3 + 48,
          zoom: 1.5,
        }}
        onPaneClick={() => {
          setSelectedChatModelVersion(null);
        }}
        onNodeMouseEnter={onNodeMouseEnter}
        onNodeMouseLeave={onNodeMouseLeave}
      >
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
        {chatModelVersionListData && (
          <InitialVersionDrawer open={chatModelVersionListData?.length == 0} />
        )}
        <VersionDetailsDrawer open={selectedChatModelVersion != null} />
        <VersionListDrawer
          open={isCreateVariantOpen && selectedChatModelVersion != null}
        />
      </ReactFlow>
      {hoveredVersionData && (
        <VersionInfoOverlay versionData={hoveredVersionData} />
      )}
    </>
  );
};

function VersionInfoOverlay({ versionData }) {
  const { chatModelData } = useChatModel();
  const { chatModelVersionListData } = useChatModelVersion();
  const hoveredVersionData = useMemo(() => {
    return chatModelVersionListData?.find(
      (version) => version.version == versionData.version
    );
  }, [versionData, chatModelVersionListData]);

  return (
    <div
      className={classNames(
        "fixed rounded-lg flex flex-col bg-popover/80 backdrop-blur-sm text-base-content h-10 w-10 z-[100]",
        "w-fit h-fit p-4 gap-y-2"
      )}
      style={{
        left: versionData.left ? versionData.left + 10 : "auto",
        right: versionData.right ? versionData.right + 10 : "auto",
        top: versionData.top ? versionData.top + 10 : "auto",
        bottom: versionData.bottom ? versionData.bottom + 10 : "auto",
      }}
    >
      <p className="text-lg font-medium">
        {chatModelData?.name}{" "}
        <span className="font-semibold text-xl">
          <i>V</i> {hoveredVersionData?.version}
        </span>
      </p>
      <p className="text-sm text-muted-content">
        Created {dayjs(hoveredVersionData?.created_at).fromNow()}
      </p>
      <div className="flex flex-row gap-x-1">
        {hoveredVersionData?.tags?.map((tag: string) => (
          <VersionTag key={tag} name={tag} />
        ))}
      </div>
      {hoveredVersionData?.memo && (
        <p className="p-1 bg-input rounded-md">{hoveredVersionData?.memo}</p>
      )}
    </div>
  );
}

function InitialVersionDrawer({ open }: { open: boolean }) {
  const windowHeight = useWindowHeight();
  const [lowerBoxHeight, setLowerBoxHeight] = useState(windowHeight * 0.6);
  const { chatModelData } = useChatModel();
  const {
    modifiedSystemPrompt,
    selectedModel,
    selectedFunctions,
    setSelectedModel,
    setSelectedFunctions,
    setModifiedSystemPrompt,
  } = useChatModelVersionStore();

  return (
    <Drawer
      open={open}
      direction="right"
      classNames="!w-[100vw] px-4 flex flex-col justify-start items-center pb-4"
      duration={200}
    >
      <div className="flex flex-col justify-start w-full max-w-4xl h-full pl-20">
        <div className="flex flex-row justify-between items-center my-2">
          <p className="text-2xl font-bold">
            {chatModelData?.name} <i>V</i> 1
          </p>
          <div className="flex flex-row w-fit justify-end items-center gap-x-2">
            <FunctionSelector
              selectedFunctions={selectedFunctions}
              setSelectedFunctions={setSelectedFunctions}
            />
            <ModelSelector
              modelName={selectedModel}
              setModel={setSelectedModel}
            />
          </div>
        </div>
        <div className="bg-base-200 flex-grow w-full p-4 rounded-t-box overflow-auto select-none">
          <div className="flex flex-col h-fit gap-y-2 justify-start items-center">
            <PromptComponent
              systemPrompt={modifiedSystemPrompt}
              setSystemPrompt={setModifiedSystemPrompt}
            />
          </div>
        </div>
        <div className="relative">
          <ResizableSeparator
            height={lowerBoxHeight}
            setHeight={setLowerBoxHeight}
          />
          <div
            className="mt-4 backdrop-blur-sm"
            style={{ height: lowerBoxHeight }}
          >
            <ChatUI versionUuid="new" />
          </div>
        </div>
      </div>
    </Drawer>
  );
}

function VersionDetailsDrawer({ open }: { open: boolean }) {
  const [windowWidth, windowHeight] = useWindowSize();
  const queryClient = useQueryClient();
  const { projectData } = useProject();
  const { chatModelData } = useChatModel();
  const { chatModelVersionListData, refetchChatModelVersionListData } =
    useChatModelVersion();
  const {
    isCreateVariantOpen,
    selectedChatModelVersion,
    originalVersionData,
    modifiedSystemPrompt,
    selectedModel,
    selectedFunctions,
    fullScreenChatVersion,
    newVersionCache,
    setIsCreateVariantOpen,
    setSelectedModel,
    setSelectedFunctions,
    setOriginalVersionData,
    setModifiedSystemPrompt,
    setSelectedChatModelVersion,
    setFullScreenChatVersion,
  } = useChatModelVersionStore();

  const selectedChatModelVersionUuid = useMemo(() => {
    if (!chatModelVersionListData || !selectedChatModelVersion) return null;
    return chatModelVersionListData.find(
      (v) => v.version == selectedChatModelVersion
    )?.uuid;
  }, [chatModelVersionListData, selectedChatModelVersion]);
  const { chatModelVersionData } = useChatModelVersionDetails(
    selectedChatModelVersionUuid
  );

  const [lowerBoxHeight, setLowerBoxHeight] = useState(240);

  useEffect(() => {
    setSelectedChatModelVersion(null);
  }, [setSelectedChatModelVersion]);

  useEffect(() => {
    if (!selectedChatModelVersion || !chatModelVersionListData) return;
    if (selectedChatModelVersion == originalVersionData?.version) return;
    const data = chatModelVersionListData?.find(
      (version) => version.version === selectedChatModelVersion
    );
    if (data?.model) {
      setSelectedModel(data?.model);
    }
    if (data?.functions) {
      setSelectedFunctions(data?.functions);
    }
    setOriginalVersionData(data);
  }, [
    selectedChatModelVersion,
    chatModelVersionListData,
    originalVersionData?.version,
    setOriginalVersionData,
    setSelectedFunctions,
    setSelectedModel,
  ]);

  useEffect(() => {
    if (originalVersionData) {
      setModifiedSystemPrompt(originalVersionData.system_prompt);
    } else {
      setModifiedSystemPrompt("");
    }
  }, [selectedChatModelVersion, originalVersionData, setModifiedSystemPrompt]);

  const isEqualToOriginal = useMemo(() => {
    if (!isCreateVariantOpen) return true;

    const isSystemPromptEqual =
      originalVersionData?.system_prompt == modifiedSystemPrompt;
    const isModelEqual = originalVersionData?.model == selectedModel;
    const areFunctionsEqual = arePrimitiveListsEqual(
      originalVersionData?.functions ?? [],
      selectedFunctions
    );

    return isSystemPromptEqual && isModelEqual && areFunctionsEqual;
  }, [
    isCreateVariantOpen,
    originalVersionData,
    modifiedSystemPrompt,
    selectedModel,
    selectedFunctions,
  ]);

  const isEqualToCache = useMemo(() => {
    if (!isCreateVariantOpen || !newVersionCache) return true;

    const isSystemPromptEqual =
      newVersionCache?.systemPrompt == modifiedSystemPrompt;
    const isModelEqual = newVersionCache?.model == selectedModel;
    const areFunctionsEqual = arePrimitiveListsEqual(
      newVersionCache?.functions,
      selectedFunctions
    );

    return isSystemPromptEqual && isModelEqual && areFunctionsEqual;
  }, [
    isCreateVariantOpen,
    newVersionCache,
    modifiedSystemPrompt,
    selectedModel,
    selectedFunctions,
  ]);

  const isNewVersionReady = useMemo(
    () => !isEqualToCache && !isEqualToOriginal,
    [isEqualToCache, isEqualToOriginal]
  );

  useHotkeys(
    "esc",
    () => {
      if (fullScreenChatVersion) {
        setFullScreenChatVersion(null);
      } else if (isCreateVariantOpen) {
        setIsCreateVariantOpen(false);
      } else if (selectedChatModelVersion) {
        setSelectedChatModelVersion(null);
      }
    },
    {
      enableOnFormTags: true,
      preventDefault: true,
    }
  );

  function handleClickCreateVariant() {
    setIsCreateVariantOpen(true);
  }

  async function handleClickPublish() {
    const toastId = toast.loading("Publishing...");

    const previousPublishedUuid = chatModelVersionListData?.find(
      (v) => v.is_published
    )?.uuid;
    await updatePublishedChatModelVersion({
      uuid: selectedChatModelVersionUuid,
      project_uuid: projectData?.uuid,
      previous_published_version_uuid: previousPublishedUuid,
      project_version: projectData?.version,
    });
    await refetchChatModelVersionListData();
    queryClient.invalidateQueries({
      predicate: (query: any) => query.queryKey[0] === "chatModelVersionData",
    });
    setSelectedChatModelVersion(null);
    toast.update(toastId, {
      containerId: "default",
      render: "Published successfully!",
      type: "success",
      isLoading: false,
      autoClose: 2000,
    });
  }

  async function handleSetMemo(newMemo: string) {
    await updateChatModelVersionMemo({
      uuid: selectedChatModelVersionUuid,
      memo: newMemo,
    });
    queryClient.invalidateQueries([
      "chatModelVersionData",
      { uuid: selectedChatModelVersionUuid },
    ]);
  }

  return (
    <Drawer
      open={open}
      direction="right"
      style={{ width: isCreateVariantOpen ? "calc(100vw - 5rem)" : "auto" }}
      classNames={classNames(
        isCreateVariantOpen ? "backdrop-blur-md" : "!w-[60vw]",
        "mr-4"
      )}
    >
      {open && (
        <div
          className={classNames(
            "w-full h-full bg-transparent p-4 flex flex-col justify-start",
            isCreateVariantOpen && "pr-0"
          )}
        >
          {/* Header */}
          <div className="flex flex-row justify-between items-center mb-2 w-full">
            <div
              className={classNames(
                "flex flex-row items-center justify-between",
                isCreateVariantOpen ? "w-1/2" : "w-full"
              )}
            >
              <div className="flex flex-row gap-x-2 justify-start items-center">
                <p className="text-base-content font-bold text-lg">
                  {chatModelData?.name} <i>V</i> {chatModelVersionData?.version}
                </p>
                {chatModelVersionData?.is_published && !isCreateVariantOpen && (
                  <div className="flex flex-row gap-x-2 items-center px-2 justify-self-start">
                    <div className="w-2 h-2 rounded-full bg-secondary" />
                    <p className="text-base-content font-medium text-sm">
                      Published
                    </p>
                  </div>
                )}
                <div className="ml-2">
                  <TagsSelector
                    modelType="ChatModel"
                    versionUuid={selectedChatModelVersionUuid}
                    previousTags={chatModelVersionData?.tags}
                  />
                </div>
              </div>
              {!isCreateVariantOpen && (
                <div className="flex flex-row gap-x-2 items-center justify-end">
                  {!chatModelVersionData?.is_published && (
                    <button
                      className="flex flex-row gap-x-2 items-center btn btn-sm normal-case font-normal h-10 bg-secondary-content hover:bg-secondary group"
                      onClick={handleClickPublish}
                    >
                      <RocketLaunch
                        className="text-secondary group-hover:text-secondary-content transition-colors"
                        size={20}
                        weight="fill"
                      />
                      <p className="text-base-100 group-hover:text-secondary-content transition-colors">
                        Publish
                      </p>
                    </button>
                  )}
                  <button
                    className="flex flex-row gap-x-2 items-center btn btn-sm normal-case font-normal h-10 border-[1px] border-neutral-content bg-transparent hover:bg-neutral-content/20"
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
                      setSelectedChatModelVersion(null);
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
            {isCreateVariantOpen && (
              <div className="flex flex-row w-1/2 justify-between items-center mb-2">
                <div className="flex flex-row justify-start items-center gap-x-3">
                  <div className="flex flex-col items-start justify-center">
                    {isEqualToOriginal ||
                    !isEqualToCache ||
                    !newVersionCache ? (
                      <p className="text-base-content font-medium text-lg">
                        New Version
                      </p>
                    ) : (
                      <p className="text-base-content font-medium text-lg">
                        {chatModelData?.name} <i>V</i>{" "}
                        {newVersionCache?.version}
                      </p>
                    )}
                    <p className="text-base-content text-sm">
                      From&nbsp;
                      <u>V{originalVersionData?.version}</u>
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
          {/* Prompt editor */}
          <motion.div className="bg-base-200 w-full p-4 rounded-t-box overflow-auto flex-grow">
            {isCreateVariantOpen ? (
              <div className="flex flex-row justify-between items-start mb-2">
                <div className="flex flex-col w-1/2 justify-start gap-y-2 items-start mb-2">
                  <div className="flex flex-row justify-start gap-x-4 items-start">
                    <div className="flex flex-col items-start justify-start">
                      <label className="label text-xs font-medium">
                        <span className="label-text">Model</span>
                      </label>
                      <ModelDisplay modelName={chatModelVersionData?.model} />
                    </div>
                    <div className="w-auto flex flex-col items-start justify-start">
                      <label className="label text-xs font-medium">
                        <span className="label-text">Functions</span>
                      </label>
                      {originalVersionData?.functions && (
                        <div className="w-full flex flex-row flex-wrap items-center gap-x-1 gap-y-2">
                          {originalVersionData?.functions?.map(
                            (functionName) => (
                              <Badge
                                key={functionName}
                                className="text-sm"
                                variant="default"
                              >
                                {functionName}
                              </Badge>
                            )
                          )}
                        </div>
                      )}
                      {(!originalVersionData?.functions ||
                        originalVersionData?.functions?.length == 0) && (
                        <Badge className="text-sm" variant="muted">
                          No functions
                        </Badge>
                      )}
                    </div>
                  </div>
                  <ClickToEditInput
                    textarea
                    value={originalVersionData?.memo}
                    setValue={handleSetMemo}
                    placeholder="Memo"
                  />
                </div>
                <div className="flex flex-col w-1/2 justify-start gap-y-2 items-start mb-2">
                  <div className="flex flex-row justify-start gap-x-4 items-start">
                    <div className="flex flex-col items-start justify-start">
                      <label className="label text-xs font-medium">
                        <span className="label-text">Model</span>
                      </label>
                      <div className="flex flex-row justify-end gap-x-3 items-center">
                        <ModelSelector
                          modelName={selectedModel}
                          setModel={setSelectedModel}
                        />
                      </div>
                    </div>
                    <div className="flex flex-col items-start justify-start">
                      <label className="label text-xs font-medium">
                        <span className="label-text">Functions</span>
                      </label>
                      <FunctionSelector
                        selectedFunctions={selectedFunctions}
                        setSelectedFunctions={setSelectedFunctions}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap justify-start gap-x-4 items-start mb-6">
                <div className="flex flex-col items-start justify-start">
                  <label className="label text-xs font-medium">
                    <span className="label-text">Model</span>
                  </label>
                  <ModelDisplay modelName={chatModelVersionData?.model} />
                </div>
                <div className="w-auto flex flex-col items-start justify-start">
                  <label className="label text-xs font-medium">
                    <span className="label-text">Functions</span>
                  </label>
                  {originalVersionData?.functions && (
                    <div className="w-full flex flex-row flex-wrap items-center gap-x-1 gap-y-2">
                      {originalVersionData?.functions?.map((functionName) => (
                        <Badge
                          key={functionName}
                          className="text-sm"
                          variant="default"
                        >
                          {functionName}
                        </Badge>
                      ))}
                    </div>
                  )}
                  {(!originalVersionData?.functions ||
                    originalVersionData?.functions?.length == 0) && (
                    <Badge className="text-sm" variant="muted">
                      No functions
                    </Badge>
                  )}
                </div>
                <ClickToEditInput
                  textarea
                  value={originalVersionData?.memo}
                  setValue={handleSetMemo}
                  placeholder="Memo"
                />
              </div>
            )}
            <div className="flex flex-col gap-y-2 justify-start items-end">
              {originalVersionData?.system_prompt &&
                (isCreateVariantOpen ? (
                  <PromptDiffComponent
                    systemPrompt={originalVersionData?.system_prompt}
                    setSystemPrompt={setModifiedSystemPrompt}
                  />
                ) : (
                  <PromptComponent
                    systemPrompt={originalVersionData?.system_prompt}
                  />
                ))}
            </div>
          </motion.div>
          <div className="relative backdrop-blur-md h-fit">
            <ResizableSeparator
              height={lowerBoxHeight}
              setHeight={setLowerBoxHeight}
            />
            <div
              className="flex flex-row justify-between items-start mt-4 gap-x-4"
              style={{ height: lowerBoxHeight }}
            >
              <ChatUI
                versionUuid={selectedChatModelVersionUuid}
                className={classNames(isCreateVariantOpen && "!w-1/2")}
              />
              {isCreateVariantOpen && (
                <ChatUI
                  versionUuid={
                    isEqualToOriginal || !isEqualToCache || !newVersionCache
                      ? "new"
                      : newVersionCache?.uuid
                  }
                  className="!w-1/2"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </Drawer>
  );
}

function VersionListDrawer({ open }: { open: boolean }) {
  const { chatModelVersionListData } = useChatModelVersion();
  const {
    isCreateVariantOpen,
    selectedChatModelVersion,
    newVersionCache,
    setIsCreateVariantOpen,
    setSelectedChatModelVersion,
    setNewVersionCache,
  } = useChatModelVersionStore();
  return (
    <Drawer open={open} direction="left" classNames="!w-[5rem] pl-2 relative">
      {isCreateVariantOpen && selectedChatModelVersion != null && (
        <div className="w-full h-full bg-transparent flex flex-col justify-center items-start gap-y-3">
          <button
            className="absolute top-6 left-2 flex flex-col gap-y-2 pt-1 items-center btn btn-sm normal-case font-normal bg-transparent border-transparent h-10 hover:bg-neutral-content/20"
            onClick={() => {
              setIsCreateVariantOpen(false);
            }}
          >
            <div className="flex flex-col">
              <XCircle size={22} />
              <p className="text-base-content text-xs">Esc</p>
            </div>
          </button>
          <div className="h-full overflow-auto mt-20">
            {chatModelVersionListData?.map((versionData) => {
              return (
                <div
                  className={classNames(
                    "flex flex-row items-center gap-x-2 rounded-lg p-2 backdrop-blur-sm hover:bg-base-content/10 transition-all cursor-pointer relative",
                    "active:scale-90",
                    selectedChatModelVersion === versionData.version
                      ? "bg-base-content/10"
                      : "bg-transparent",
                    newVersionCache?.version == versionData.version &&
                      "tooltip tooltip-bottom tooltip-info"
                  )}
                  data-tip="New!"
                  key={versionData.version}
                  onClick={() => {
                    setNewVersionCache(null);
                    setSelectedChatModelVersion(versionData.version);
                  }}
                >
                  <div
                    className={classNames(
                      "absolute h-2 w-2 bg-info top-0 right-0 rounded-full z-50",
                      newVersionCache?.version == versionData.version
                        ? "animate-pulse"
                        : "hidden"
                    )}
                  />
                  <p className="text-base-content font-semibold text-lg">
                    V{versionData.version}
                  </p>
                  {versionData?.is_published && (
                    <div className="w-2 h-2 rounded-full bg-secondary" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </Drawer>
  );
}

const PromptComponent = ({
  systemPrompt,
  setSystemPrompt,
}: {
  systemPrompt: string;
  setSystemPrompt?: (prompt: string) => void;
}) => {
  const [height, setHeight] = useState(30);
  const editorRef = useRef(null);
  const windowHeight = useWindowHeight();
  const { setFocusedEditor } = useChatModelVersionStore();

  function setEditorHeight() {
    const contentHeight = editorRef.current?.getContentHeight();
    const minHeight = 120;
    const maxHeight = windowHeight * 0.7;
    if (contentHeight) {
      setHeight(Math.min(Math.max(minHeight, contentHeight), maxHeight) + 20);
    }
  }

  const handleEditorDidMount = (editor: editor.IStandaloneCodeEditor) => {
    const contentHeight = editor.getContentHeight();
    editorRef.current = editor;
    if (contentHeight) {
      setHeight(contentHeight + 20);
    }
    editor.onDidFocusEditorWidget(() => {
      setFocusedEditor(editorRef.current);
    });
    editor.onDidContentSizeChange(() => {
      setEditorHeight();
    });
    setEditorHeight();
  };

  return (
    <motion.div className="w-full h-fit flex flex-col justify-start items-center bg-base-100 rounded-box">
      <div
        className={classNames(
          "w-full h-10 min-h-[2.5rem] flex flex-row justify-start items-center py-1 px-3"
        )}
      >
        <p className="text-base-content font-medium">
          System prompt (Custom instructions)
        </p>
      </div>
      <PromptEditor
        value={systemPrompt}
        onChange={(value) => {
          if (setSystemPrompt) {
            setSystemPrompt(value);
          }
        }}
        options={{
          readOnly: setSystemPrompt == undefined,
        }}
        loading={<div className="loading loading-xs loading-dots" />}
        onMount={handleEditorDidMount}
        height={height}
      />
    </motion.div>
  );
};

const PromptDiffComponent = ({
  systemPrompt,
  setSystemPrompt,
}: {
  systemPrompt: string;
  setSystemPrompt: (prompt: string) => void;
}) => {
  const windowHeight = useWindowHeight();
  const [open, setOpen] = useState(true);
  const [height, setHeight] = useState(30);
  const originalEditorRef = useRef(null);
  const modifiedEditorRef = useRef(null);
  const { setFocusedEditor } = useChatModelVersionStore();

  function setEditorHeight() {
    const originalHeight = originalEditorRef.current?.getContentHeight();
    const modifiedHeight = modifiedEditorRef.current?.getContentHeight();
    const minHeight = 120;
    const maxHeight = windowHeight * 0.7;
    if (originalHeight && modifiedHeight) {
      setHeight(
        Math.min(
          Math.max(minHeight, originalHeight, modifiedHeight),
          maxHeight
        ) + 20
      );
    }
  }

  const handleEditorDidMount = (editor: MonacoDiffEditor, monaco: Monaco) => {
    originalEditorRef.current = editor.getOriginalEditor();
    modifiedEditorRef.current = editor.getModifiedEditor();
    modifiedEditorRef.current?.onDidFocusEditorWidget(() => {
      setFocusedEditor(modifiedEditorRef.current);
    });
    modifiedEditorRef.current.onDidChangeModelContent(() => {
      setSystemPrompt(modifiedEditorRef.current?.getValue());
    });
    modifiedEditorRef.current.onDidContentSizeChange(() => {
      setEditorHeight();
    });
    setEditorHeight();
  };

  return (
    <div className="w-full h-fit flex flex-col justify-start items-center bg-base-100 rounded-box">
      <div
        className={classNames(
          "w-full h-10 min-h-[2.5rem] flex flex-row justify-start items-center py-1 px-3 cursor-pointer"
        )}
      >
        <p className="text-base-content font-semibold">
          System prompt (Custom instructions)
        </p>
      </div>
      {open && (
        <PromptDiffEditor
          className="gap-x-8"
          original={systemPrompt}
          modified={systemPrompt}
          loading={<div className="loading loading-xs loading-dots" />}
          onMount={handleEditorDidMount}
          height={height}
        />
      )}
    </div>
  );
};

function ModelVersionNode({ data }) {
  const {
    selectedChatModelVersion,
    setSelectedChatModelVersion,
    setNewVersionCache,
  } = useChatModelVersionStore();

  function handleNodeClick() {
    setSelectedChatModelVersion(data.version);
    setNewVersionCache(null);
  }

  return (
    <div
      className={classNames(
        "bg-base-200 p-2 rounded-full flex justify-center items-center",
        "w-20 h-20 visible cursor-pointer",
        "transition-colors",
        selectedChatModelVersion == data.version
          ? "border-neutral-content border-2"
          : "border-none",
        data.isPublished
          ? "bg-secondary/80 hover:bg-secondary/50"
          : "bg-base-200 hover:bg-blue-500/30"
      )}
      onClick={handleNodeClick}
    >
      <Handle type="target" position={Position.Top} />
      <p className="text-base-content font-medium italic">
        V <span className="font-bold text-xl not-italic">{data.label}</span>
      </p>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}
