"use client";

import { Drawer } from "@/components/Drawer";
import classNames from "classnames";
import { useEffect, useMemo, useRef, useState } from "react";
import ReactFlow, {
  Background,
  BackgroundVariant,
  Handle,
  Position,
} from "reactflow";
import { motion } from "framer-motion";
import { GitBranch, RocketLaunch, XCircle } from "@phosphor-icons/react";
import { toast } from "react-toastify";
import { useSupabaseClient } from "@/apis/base";
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
import { updatePublishedChatModelVersion } from "@/apis/chatModelVersion";
import { ChatUI } from "@/components/ChatUI";
import { useWindowHeight, useWindowSize } from "@react-hook/window-size";
import { FunctionSelector } from "@/components/select/FunctionSelector";
import { useChatModel } from "@/hooks/useChatModel";
import { Monaco, MonacoDiffEditor } from "@monaco-editor/react";

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
        <div className="fixed top-16 left-24 z-50">
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
    (acc, curr) => acc + curr.total_token_usage.total_tokens,
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
        total_token_usage: {
          total_tokens: 0,
          prompt_tokens: 0,
          completion_tokens: 0,
        },
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
        dataKey="total_token_usage.total_tokens"
        xAxisDataKey="day"
        title="Token usage"
        mainData={totalTokens}
      />
    </div>
  );
};

// Versions Tab Page
const VersionsPage = () => {
  const { createSupabaseClient } = useSupabaseClient();
  const { chatModelVersionListData, refetchChatModelVersionListData } =
    useChatModelVersion();
  const [nodes, setNodes] = useState(initialNodes);
  const [edges, setEdges] = useState(initialEdges);

  const {
    isCreateVariantOpen,
    selectedChatModelVersion,
    setSelectedChatModelVersion,
    setOriginalVersionData,
  } = useChatModelVersionStore();
  const nodeTypes = useMemo(() => ({ modelVersion: ModelVersionNode }), []);

  const queryClient = useQueryClient();
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

  useEffect(() => {
    setSelectedChatModelVersion(null);
  }, []);

  useEffect(() => {
    if (!chatModelVersionData) return;
    setOriginalVersionData(chatModelVersionData);
  }, [chatModelVersionData]);

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
      .id((d) => d.version)
      .parentId((d) => d.from_version)(dataWithSyntheticRoot);

    // Calculate the maximum number of nodes at any depth.
    const maxNodesAtDepth = Math.max(
      ...root.descendants().map((d: any) => d.depth)
    );
    const requiredWidth = maxNodesAtDepth * 300;
    const layout = tree().size([requiredWidth, root.height * 160]);
    const nodes = layout(root).descendants();

    let publishedNodePosition = null;
    nodes.forEach((node) => {
      if (node.data.is_published) {
        publishedNodePosition = { x: node.x, y: node.y };
      }
    });

    if (publishedNodePosition) {
      const centerX = windowWidth / 2;
      const centerY = (windowHeight - 48) / 2;
      const offsetX = centerX - publishedNodePosition.x;
      const offsetY = centerY - publishedNodePosition.y;
      nodes.forEach((node) => {
        node.x += offsetX;
        node.y += offsetY;
      });
    }

    const generatedNodes = nodes
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
  }, [chatModelVersionListData, windowWidth]);

  return (
    <>
      <ReactFlow
        nodeTypes={nodeTypes}
        nodes={nodes}
        edges={edges}
        proOptions={{ hideAttribution: true }}
        defaultViewport={{
          x: -windowWidth / 3 + 80,
          y: -windowHeight / 3 + 48,
          zoom: 1.5,
        }}
        // fitView={true}
        onPaneClick={() => {
          setSelectedChatModelVersion(null);
        }}
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
    </>
  );
};

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
  const { createSupabaseClient } = useSupabaseClient();
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
  }, []);

  useEffect(() => {
    if (originalVersionData?.version === selectedChatModelVersion) return;
    const data = chatModelVersionListData?.find(
      (version) => version.version === selectedChatModelVersion
    );
    if (data?.model) {
      setSelectedModel(data?.model);
    }
    setOriginalVersionData(data);
  }, [selectedChatModelVersion, chatModelVersionListData]);

  useEffect(() => {
    if (originalVersionData) {
      setModifiedSystemPrompt(originalVersionData.system_prompt);
    } else {
      setModifiedSystemPrompt("");
    }
  }, [selectedChatModelVersion, originalVersionData]);

  const isNewVersionReady = useMemo(() => {
    if (!isCreateVariantOpen) return false;
    if (
      originalVersionData?.system_prompt == modifiedSystemPrompt &&
      originalVersionData?.model == selectedModel &&
      originalVersionData?.functions == selectedFunctions
    )
      return false;

    if (newVersionCache) {
      if (
        newVersionCache?.systemPrompt == modifiedSystemPrompt &&
        newVersionCache?.model == selectedModel
      )
        return false;
    }
    return true;
  }, [
    isCreateVariantOpen,
    originalVersionData,
    newVersionCache,
    selectedModel,
    modifiedSystemPrompt,
    selectedFunctions,
  ]);

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

    await updatePublishedChatModelVersion(
      await createSupabaseClient(),
      selectedChatModelVersionUuid,
      previousPublishedUuid,
      projectData?.version,
      projectData?.uuid
    );
    await refetchChatModelVersionListData();
    queryClient.invalidateQueries({
      predicate: (query: any) => query.queryKey[0] === "chatModelVersionData",
    });
    setSelectedChatModelVersion(null);
    toast.update(toastId, {
      render: "Published successfully!",
      type: "success",
      isLoading: false,
      autoClose: 2000,
    });
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
                    {isNewVersionReady ? (
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
          {/* <div
            className="flex flex-col justify-between"
            style={{
              height: windowHeight - 120,
            }}
          >
            <motion.div
              className="bg-base-200 w-full p-4 rounded-t-box overflow-auto flex-grow-0"
              style={{
                height: windowHeight - lowerBoxHeight - 120,
              }}
            >
              <div className="flex flex-wrap justify-start gap-x-4 items-start mb-2">
                <div className="flex flex-col items-start justify-start">
                  <label className="label text-xs font-medium">
                    <span className="label-text">Model</span>
                  </label>
                  <ModelDisplay modelName={chatModelVersionData?.model} />
                </div>
                <div className="flex flex-col items-start justify-start">
                  <label className="label text-xs font-medium">
                    <span className="label-text">Functions</span>
                  </label>
                  {chatModelVersionData?.functions && (
                    <div className="w-full flex flex-row flex-wrap items-center gap-x-1 gap-y-2">
                      {chatModelVersionData?.functions?.map((funcName) => (
                        <Badge
                          key={funcName}
                          className="text-sm"
                          variant="default"
                        >
                          {funcName}
                        </Badge>
                      ))}
                    </div>
                  )}
                  {(!chatModelVersionData?.functions ||
                    chatModelVersionData?.functions?.length == 0) && (
                    <Badge className="text-sm" variant="muted">
                      No functions
                    </Badge>
                  )}
                </div>
              </div>
              <div className="flex flex-col gap-y-2 justify-start items-start">
                {chatModelVersionData && (
                  <PromptComponent
                    systemPrompt={chatModelVersionData.system_prompt}
                  />
                )}
              </div>
            </motion.div>
            <div className="min-h-[120px] backdrop-blur-md">
              <ResizableSeparator
                height={lowerBoxHeight}
                setHeight={(height) => {
                  if (height < 160) return;
                  setLowerBoxHeight(height);
                }}
                className="mx-4"
              />
              <div
                className="my-4 backdrop-blur-sm"
                style={{ height: lowerBoxHeight }}
              >
                {selectedChatModelVersion && (
                  <ChatUI versionUuid={selectedChatModelVersionUuid} />
                )}
              </div>
            </div>
          </div> */}
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
                    isNewVersionReady ? "new" : newVersionCache?.uuid ?? "new"
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

  const handleEditorDidMount = (editor: editor.IStandaloneCodeEditor) => {
    const contentHeight = editor.getContentHeight();
    editorRef.current = editor;

    if (contentHeight) {
      setHeight(contentHeight);
    }

    editor.onDidFocusEditorWidget(() => {
      setFocusedEditor(editorRef.current);
    });
  };

  useEffect(() => {
    const contentHeight = editorRef.current?.getContentHeight();
    const minHeight = 200;
    const maxHeight = windowHeight * 0.7;
    if (contentHeight) {
      setHeight(Math.min(Math.max(minHeight, contentHeight), maxHeight));
    }
  }, [editorRef.current?.getContentHeight()]);

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

  const handleEditorDidMount = (editor: MonacoDiffEditor, monaco: Monaco) => {
    originalEditorRef.current = editor.getOriginalEditor();
    modifiedEditorRef.current = editor.getModifiedEditor();
    const originalHeight = originalEditorRef.current?.getContentHeight();
    const maxHeight = windowHeight * 0.7;
    if (originalHeight) {
      setHeight(Math.min(originalHeight, maxHeight));
    }
    modifiedEditorRef.current?.onDidFocusEditorWidget(() => {
      setFocusedEditor(modifiedEditorRef.current);
    });

    modifiedEditorRef.current.onDidChangeModelContent(() => {
      setSystemPrompt(modifiedEditorRef.current?.getValue());
      const modifiedHeight = modifiedEditorRef.current?.getContentHeight();
      const maxHeight = windowHeight * 0.7;
      if (modifiedHeight) {
        setHeight(Math.min(modifiedHeight, maxHeight));
      }
    });
  };

  useEffect(() => {
    const originalHeight = originalEditorRef.current?.getContentHeight();
    const modifiedHeight = modifiedEditorRef.current?.getContentHeight();
    const maxHeight = windowHeight * 0.7;
    if (modifiedHeight > originalHeight) {
      setHeight(Math.min(modifiedHeight, maxHeight));
    } else {
      setHeight(Math.min(originalHeight, maxHeight));
    }
  }, [originalEditorRef.current, modifiedEditorRef.current]);

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
  const { selectedChatModelVersion, setSelectedChatModelVersion } =
    useChatModelVersionStore();
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
      onClick={() => setSelectedChatModelVersion(data.version)}
    >
      <Handle type="target" position={Position.Top} />
      <p className="text-base-content font-medium italic">
        V <span className="font-bold text-xl not-italic">{data.label}</span>
      </p>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}
