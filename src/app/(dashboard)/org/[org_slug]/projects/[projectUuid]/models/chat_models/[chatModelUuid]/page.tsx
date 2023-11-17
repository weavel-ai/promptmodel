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
import {
  ArrowsOut,
  CaretDown,
  CornersOut,
  RocketLaunch,
  XCircle,
} from "@phosphor-icons/react";
import { toast } from "react-toastify";
import { useSupabaseClient } from "@/apis/base";
import "reactflow/dist/style.css";
import { useRunLog } from "@/hooks/useRunLog";
import { RunLog } from "@/apis/runlog";
import { editor } from "monaco-editor";
import { useHotkeys } from "react-hotkeys-hook";
import { tree, stratify } from "d3-hierarchy";
import { useQueryClient } from "@tanstack/react-query";
import { ResizableSeparator } from "@/components/ResizableSeparator";
import { useProject } from "@/hooks/useProject";
import ReactJson from "react-json-view";
import { SelectTab } from "@/components/SelectTab";
import {
  useDailyChatLogMetrics,
  useDailyRunLogMetrics,
} from "@/hooks/analytics";
import { CustomAreaChart } from "@/components/charts/CustomAreaChart";
import { DatePickerWithRange } from "@/components/ui/DatePickerWithRange";
import { DateRange } from "react-day-picker";
import { subDays } from "date-fns";
import dayjs from "dayjs";
import { Badge } from "@/components/ui/badge";
import { PromptEditor } from "@/components/editor/PromptEditor";
import { ModalPortal } from "@/components/ModalPortal";
import { useChatModelVersion } from "@/hooks/useChatModelVersion";
import { useChatModelVersionStore } from "@/stores/chatModelVersionStore";
import { useChatModelVersionDetails } from "@/hooks/useChatModelVersionDetails";
import { ModelDisplay } from "@/components/ModelSelector";
import { updatePublishedChatModelVersion } from "@/apis/chatModelVersion";
import { ChatUI } from "@/components/ChatUI";
import { useWindowHeight, useWindowSize } from "@react-hook/window-size";

const initialNodes = [];
const initialEdges = [];

enum Tab {
  Analytics = "Analytics",
  Versions = "Versions",
}

const TABS = [Tab.Analytics, Tab.Versions];

export default function Page() {
  const [tab, setTab] = useState(Tab.Versions);

  return (
    <div className="w-full h-full">
      <div className="fixed top-16 left-24 z-50">
        <SelectTab
          tabs={TABS}
          selectedTab={tab}
          onSelect={(newTab) => setTab(newTab as Tab)}
        />
      </div>
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
    fullScreenChatVersion,
    selectedChatModelVersionUuid,
    setFullScreenChatVersion,
    setSelectedChatModelVersionUuid,
    setOriginalVersionData,
  } = useChatModelVersionStore();
  const { projectData } = useProject();
  const nodeTypes = useMemo(() => ({ modelVersion: ModelVersionNode }), []);

  const queryClient = useQueryClient();
  const { chatModelVersionData } = useChatModelVersionDetails(
    selectedChatModelVersionUuid
  );
  const [windowWidth, windowHeight] = useWindowSize();
  const [lowerBoxHeight, setLowerBoxHeight] = useState(240);

  useHotkeys(
    "esc",
    () => {
      if (fullScreenChatVersion) {
        setFullScreenChatVersion(null);
      } else {
        setSelectedChatModelVersionUuid(null);
      }
    },
    {
      enableOnFormTags: true,
      preventDefault: true,
    }
  );

  useEffect(() => {
    setSelectedChatModelVersionUuid(null);
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
    // Before passing your data to stratify, preprocess it:
    const dataWithSyntheticRoot = [
      {
        uuid: "synthetic-root",
        from_uuid: null,
      },
      ...chatModelVersionListData.map((item) => {
        if (!item.from_uuid) {
          return {
            ...item,
            from_uuid: "synthetic-root",
          };
        }
        return item;
      }),
    ];

    const root = stratify()
      .id((d: any) => d.uuid)
      .parentId((d: any) => d.from_uuid)(dataWithSyntheticRoot);

    // Calculate the maximum number of nodes at any depth.
    const maxNodesAtDepth = Math.max(
      ...root.descendants().map((d: any) => d.depth)
    );
    const requiredWidth = maxNodesAtDepth * 320;

    // Use the smaller of window width and required width.
    const layoutWidth = Math.min(windowWidth, requiredWidth);
    const layout = tree().size([layoutWidth, root.height * 160]);

    const nodes = layout(root).descendants();

    const generatedNodes = nodes
      .filter((node: any) => node.data.uuid !== "synthetic-root")
      .map((node: any) => {
        const item = node.data;

        if (item.from_uuid && item.from_uuid !== "synthetic-root") {
          generatedEdges.push({
            id: `e${item.uuid}-${item.from_uuid}`,
            source: item.from_uuid,
            target: item.uuid,
          });
        }

        return {
          id: item.uuid.toString(),
          type: "modelVersion",
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
  }, [chatModelVersionListData]);

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
      predicate: (query: any) =>
        query.queryKey[0] === "chatModelVersionData" &&
        (query.queryKey[1]?.uuid === selectedChatModelVersionUuid ||
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
    <>
      <ReactFlow
        nodeTypes={nodeTypes}
        nodes={nodes}
        edges={edges}
        proOptions={{ hideAttribution: true }}
        fitView={true}
        onPaneClick={() => {
          setSelectedChatModelVersionUuid(null);
        }}
      >
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
      </ReactFlow>
      <Drawer
        open={selectedChatModelVersionUuid != null}
        direction="right"
        classNames="!w-[45vw]"
      >
        <div className="w-full h-full bg-transparent p-4 flex flex-col justify-start">
          <div className="flex flex-row justify-between items-center mb-2">
            <div className="flex flex-row gap-x-2 justify-start items-center">
              <p className="text-base-content font-bold text-lg">
                ChatModel V{chatModelVersionData?.version}
              </p>
              {chatModelVersionData?.is_published && (
                <div className="flex flex-row gap-x-2 items-center px-2 justify-self-start">
                  <div className="w-2 h-2 rounded-full bg-secondary" />
                  <p className="text-base-content font-medium text-sm">
                    Published
                  </p>
                </div>
              )}
            </div>
            <div className="flex flex-row gap-x-2 items-center">
              <ModelDisplay modelName={chatModelVersionData?.model} />

              {!chatModelVersionData?.is_published && (
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
                className={classNames(
                  "flex flex-col gap-y-2 pt-1 items-center",
                  "btn btn-sm bg-transparent border-transparent h-10 hover:bg-neutral-content/20",
                  "normal-case font-normal"
                )}
                onClick={() => {
                  setSelectedChatModelVersionUuid(null);
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
                {selectedChatModelVersionUuid && (
                  <ChatUI versionUuid={selectedChatModelVersionUuid} />
                )}
              </div>
            </div>
          </div>
        </div>
      </Drawer>
    </>
  );
};

const PromptComponent = ({ systemPrompt }) => {
  const [height, setHeight] = useState(30);
  const editorRef = useRef(null);
  const windowHeight = useWindowHeight();

  const handleEditorDidMount = (editor: editor.IStandaloneCodeEditor) => {
    const contentHeight = editor.getContentHeight();
    editorRef.current = editor;
    const maxHeight = windowHeight * 0.4;
    if (contentHeight) {
      setHeight(Math.min(contentHeight, maxHeight));
    }
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
        options={{
          readOnly: true,
        }}
        loading={<div className="loading loading-xs loading-dots" />}
        onMount={handleEditorDidMount}
        height={height}
      />
    </motion.div>
  );
};

function ModelVersionNode({ data }) {
  const { selectedChatModelVersionUuid, setSelectedChatModelVersionUuid } =
    useChatModelVersionStore();
  return (
    <div
      className={classNames(
        "bg-base-200 p-2 rounded-full flex justify-center items-center",
        "w-20 h-20 visible cursor-pointer",
        "transition-colors",
        selectedChatModelVersionUuid == data.uuid
          ? "border-neutral-content border-2"
          : "border-none",
        data.isPublished
          ? "bg-secondary/80 hover:bg-secondary/50"
          : "bg-base-200 hover:bg-blue-500/30"
      )}
      onClick={() => setSelectedChatModelVersionUuid(data.uuid)}
    >
      <Handle type="target" position={Position.Top} />
      <p className="text-base-content font-medium italic">
        V <span className="font-bold text-xl not-italic">{data.label}</span>
      </p>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}
