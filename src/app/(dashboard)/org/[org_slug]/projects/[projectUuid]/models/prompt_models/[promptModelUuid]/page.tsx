"use client";

import { Drawer } from "@/components/Drawer";
import { usePromptModelVersion } from "@/hooks/usePromptModelVersion";
import { usePromptModelVersionStore } from "@/stores/promptModelVersionStore";
import classNames from "classnames";
import { useEffect, useMemo, useRef, useState } from "react";
import ReactFlow, {
  Background,
  BackgroundVariant,
  Handle,
  Position,
} from "reactflow";
import { motion } from "framer-motion";
import { usePromptModelVersionDetails } from "@/hooks/usePromptModelVersionDetails";
import {
  ArrowsOut,
  CaretDown,
  CornersOut,
  RocketLaunch,
  XCircle,
} from "@phosphor-icons/react";
import { toast } from "react-toastify";
import { updatePublishedPromptModelVersion } from "@/apis/promptModelVersion";
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
import { useDailyRunLogMetrics } from "@/hooks/analytics";
import { CustomAreaChart } from "@/components/charts/CustomAreaChart";
import { DatePickerWithRange } from "@/components/ui/DatePickerWithRange";
import { DateRange } from "react-day-picker";
import { subDays } from "date-fns";
import dayjs from "dayjs";
import { ParserTypeSelector } from "@/components/select/ParserTypeSelector";
import { Badge } from "@/components/ui/badge";
import { PromptEditor } from "@/components/editor/PromptEditor";
import { ModalPortal } from "@/components/ModalPortal";

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

  const { dailyRunLogMetrics } = useDailyRunLogMetrics(
    dayjs(dateRange?.from)?.toISOString(),
    dayjs(dateRange?.to)?.toISOString()
  );

  const totalCost = dailyRunLogMetrics?.reduce(
    (acc, curr) => acc + curr.total_cost,
    0
  );

  const totalLatency = dailyRunLogMetrics?.reduce(
    (acc, curr) => acc + curr.avg_latency * curr.total_runs,
    0
  );

  const totalRuns = dailyRunLogMetrics?.reduce(
    (acc, curr) => acc + curr.total_runs,
    0
  );

  const totalTokens = dailyRunLogMetrics?.reduce(
    (acc, curr) => acc + curr.total_token_usage.total_tokens,
    0
  );

  const avgLatency = totalRuns != 0 ? totalLatency / totalRuns : 0;

  function formatDate(inputDate: Date): string {
    const year = inputDate.getFullYear();
    const month = (inputDate.getMonth() + 1).toString().padStart(2, "0");
    const day = inputDate.getDate().toString().padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  let date = new Date(dateRange?.from);
  const existingDates = dailyRunLogMetrics?.map((metric) => metric.day);

  while (date <= dateRange?.to) {
    if (!existingDates?.includes(formatDate(date))) {
      dailyRunLogMetrics?.push({
        day: formatDate(date),
        avg_latency: 0,
        total_cost: 0,
        total_runs: 0,
        total_token_usage: {
          total_tokens: 0,
          prompt_tokens: 0,
          completion_tokens: 0,
        },
      });
    }
    date.setDate(date.getDate() + 1);
  }

  dailyRunLogMetrics?.sort((a, b) => {
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
        data={dailyRunLogMetrics}
        dataKey="total_cost"
        xAxisDataKey="day"
        title="Total Cost"
        mainData={`$${totalCost}`}
      />
      <CustomAreaChart
        data={dailyRunLogMetrics}
        dataKey="avg_latency"
        xAxisDataKey="day"
        title="Average Latency"
        mainData={`${avgLatency?.toFixed(2)}s`}
      />
      <CustomAreaChart
        data={dailyRunLogMetrics}
        dataKey="total_runs"
        xAxisDataKey="day"
        title="Total Runs"
        mainData={totalRuns}
      />
      <CustomAreaChart
        data={dailyRunLogMetrics}
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
  const { versionListData, refetchVersionListData } = usePromptModelVersion();
  const [nodes, setNodes] = useState(initialNodes);
  const [edges, setEdges] = useState(initialEdges);

  const { selectedPromptModelVersionUuid, setSelectedPromptModelVersionUuid } =
    usePromptModelVersionStore();
  const { projectData } = useProject();
  const nodeTypes = useMemo(() => ({ modelVersion: ModelVersionNode }), []);

  const queryClient = useQueryClient();
  const { promptListData, promptModelVersionData } =
    usePromptModelVersionDetails(selectedPromptModelVersionUuid);

  const { runLogData } = useRunLog(selectedPromptModelVersionUuid);

  const [lowerBoxHeight, setLowerBoxHeight] = useState(240);

  const [isFullScreen, setIsFullScreen] = useState(false);

  useHotkeys(
    "esc",
    () => {
      if (isFullScreen) {
        setIsFullScreen(false);
      } else {
        setSelectedPromptModelVersionUuid(null);
      }
    },
    {
      preventDefault: true,
    }
  );

  useEffect(() => {
    setSelectedPromptModelVersionUuid(null);
  }, []);

  // Build nodes
  useEffect(() => {
    if (!versionListData || versionListData.length === 0) return;
    const generatedEdges = [];
    // Before passing your data to stratify, preprocess it:
    const dataWithSyntheticRoot = [
      {
        uuid: "synthetic-root",
        from_uuid: null,
      },
      ...versionListData.map((item) => {
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
    const layoutWidth = Math.min(window.innerWidth, requiredWidth);
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
  }, [versionListData]);

  async function handleClickPublish() {
    const toastId = toast.loading("Publishing...");

    const previousPublishedUuid = versionListData?.find(
      (v) => v.is_published
    )?.uuid;

    await updatePublishedPromptModelVersion(
      await createSupabaseClient(),
      selectedPromptModelVersionUuid,
      previousPublishedUuid,
      projectData?.version,
      projectData?.uuid
    );
    await refetchVersionListData();
    queryClient.invalidateQueries({
      predicate: (query: any) =>
        query.queryKey[0] === "promptModelVersionData" &&
        (query.queryKey[1]?.uuid === selectedPromptModelVersionUuid ||
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
          setSelectedPromptModelVersionUuid(null);
        }}
      >
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
      </ReactFlow>
      <Drawer
        open={selectedPromptModelVersionUuid != null}
        direction="right"
        classNames="!w-[45vw]"
      >
        <div className="w-full h-full bg-transparent p-4 flex flex-col justify-start">
          <div className="flex flex-row justify-between items-center mb-2">
            <div className="flex flex-row gap-x-2 justify-start items-center">
              <p className="text-base-content font-bold text-lg">
                Prompt V{promptModelVersionData?.version}
              </p>
              {promptModelVersionData?.is_published && (
                <div className="flex flex-row gap-x-2 items-center px-2 justify-self-start">
                  <div className="w-2 h-2 rounded-full bg-secondary" />
                  <p className="text-base-content font-medium text-sm">
                    Published
                  </p>
                </div>
              )}
            </div>
            <div className="flex flex-row gap-x-2 items-center">
              {!promptModelVersionData?.is_published && (
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
                  setSelectedPromptModelVersionUuid(null);
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
              height: window.innerHeight - 120,
            }}
          >
            <motion.div
              className="bg-base-200 w-full p-4 rounded-t-box overflow-auto flex-grow-0"
              style={{
                height: window.innerHeight - lowerBoxHeight - 120,
              }}
            >
              <div className="flex flex-wrap justify-start gap-x-4 items-start mb-2">
                <div className="flex flex-col items-start justify-start">
                  <label className="label text-xs font-medium">
                    <span className="label-text">Output parser type</span>
                  </label>
                  <ParserTypeSelector
                    parser={promptModelVersionData?.parsing_type}
                  />
                </div>
                <div className="flex flex-col items-start justify-start">
                  <label className="label text-xs font-medium">
                    <span className="label-text">Output keys</span>
                  </label>
                  {promptModelVersionData?.output_keys && (
                    <div className="w-full flex flex-row flex-wrap items-center gap-x-1 gap-y-2">
                      {promptModelVersionData?.output_keys?.map((key) => (
                        <Badge
                          key={key}
                          className="text-sm"
                          variant="secondary"
                        >
                          {key}
                        </Badge>
                      ))}
                    </div>
                  )}
                  {!promptModelVersionData?.output_keys && (
                    <Badge className="text-sm" variant="muted">
                      No output keys
                    </Badge>
                  )}
                </div>
                <div className="flex flex-col items-start justify-start">
                  <label className="label text-xs font-medium">
                    <span className="label-text">Functions</span>
                  </label>
                  {promptModelVersionData?.functions && (
                    <div className="w-full flex flex-row flex-wrap items-center gap-x-1 gap-y-2">
                      {promptModelVersionData?.functions?.map((funcName) => (
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
                  {(!promptModelVersionData?.functions ||
                    promptModelVersionData?.functions?.length == 0) && (
                    <Badge className="text-sm" variant="muted">
                      No functions
                    </Badge>
                  )}
                </div>
              </div>
              <div className="flex flex-col gap-y-2 justify-start items-start">
                {promptListData?.map((prompt) => (
                  <PromptComponent prompt={prompt} />
                ))}
              </div>
            </motion.div>
            <div className="min-h-[120px] backdrop-blur-md">
              <ResizableSeparator
                height={lowerBoxHeight}
                setHeight={setLowerBoxHeight}
                className="mx-4"
              />
              <motion.div>
                <div
                  className={classNames(
                    "flex flex-col items-start gap-y-1 !my-4"
                  )}
                  style={{
                    height: lowerBoxHeight,
                  }}
                >
                  <div className="w-full flex flex-row justify-between">
                    <p className="text-xl font-bold mb-1">Run Logs</p>
                    <button
                      className={classNames(
                        "items-center",
                        "btn btn-sm bg-transparent border-transparent h-10 hover:bg-neutral-content/20"
                      )}
                      onClick={() => {
                        setIsFullScreen(!isFullScreen);
                      }}
                    >
                      <CornersOut size={24} />
                    </button>
                  </div>
                  {isFullScreen && (
                    <ModalPortal>
                      <motion.div
                        className="w-screen h-screen fixed z-[999999]"
                        initial={{ bottom: 4, right: 4 }}
                        animate={{ top: 4, left: 4, bottom: 4, right: 4 }}
                      >
                        <RunLogComponent
                          runLogData={runLogData}
                          isFullScreen={isFullScreen}
                          setIsFullScreen={setIsFullScreen}
                        />
                      </motion.div>
                    </ModalPortal>
                  )}
                  <RunLogComponent
                    runLogData={runLogData}
                    isFullScreen={isFullScreen}
                    setIsFullScreen={setIsFullScreen}
                  />
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </Drawer>
    </>
  );
};

const PromptComponent = ({ prompt }) => {
  const [open, setOpen] = useState(false);
  const [height, setHeight] = useState(30);
  const editorRef = useRef(null);

  const handleEditorDidMount = (editor: editor.IStandaloneCodeEditor) => {
    const contentHeight = editor.getContentHeight();
    editorRef.current = editor;
    const maxHeight = window.innerHeight * 0.7;
    if (contentHeight) {
      setHeight(Math.min(contentHeight, maxHeight));
    }
  };

  return (
    <motion.div
      key={prompt.step}
      className="w-full flex flex-col justify-start items-center bg-base-100 rounded-box"
      animate={{ height: open ? "auto" : "2.5rem" }}
    >
      <div
        className={classNames(
          "w-full h-10 min-h-[2.5rem] flex flex-row justify-between items-center py-1 px-3 cursor-pointer"
        )}
        onClick={() => setOpen(!open)}
      >
        <p className="text-base-content font-medium">
          #{prompt.step}. {prompt.role}
        </p>
        <CaretDown
          className={classNames(
            "text-base-content transition-transform",
            open && "transform rotate-180"
          )}
        />
      </div>
      {open && (
        <PromptEditor
          value={prompt.content}
          options={{
            readOnly: true,
          }}
          loading={<div className="loading loading-xs loading-dots" />}
          onMount={handleEditorDidMount}
          className="overflow-auto"
          height={height}
        />
      )}
    </motion.div>
  );
};

const RunLogComponent = ({ runLogData, isFullScreen, setIsFullScreen }) => {
  const [showRaw, setShowRaw] = useState(true);

  return (
    <div
      className={classNames(
        "w-full rounded-box items-center bg-base-200 p-4 flex flex-col flex-grow-1 gap-y-2 justify-start",
        isFullScreen && "h-full"
      )}
      style={{ height: !isFullScreen && "calc(100% - 2rem)" }}
    >
      <div
        className={classNames(
          "w-full max-h-full bg-base-200 rounded",
          isFullScreen && "px-4 py-2",
          !isFullScreen && "overflow-auto"
        )}
      >
        {isFullScreen && (
          <div className="w-full h-fit flex flex-row justify-between">
            <p className="text-xl font-bold">Run Logs</p>
            <button
              className={classNames(
                "items-center",
                "btn btn-sm bg-transparent border-transparent h-10 hover:bg-neutral-content/20",
                "flex flex-row gap-x-4"
              )}
              onClick={() => {
                setIsFullScreen(!isFullScreen);
              }}
            >
              <CornersOut size={24}></CornersOut>
              <kbd className="kbd">Esc</kbd>
            </button>
          </div>
        )}
        <div
          className={classNames(
            "w-full h-full",
            isFullScreen && "overflow-auto"
          )}
        >
          <table className="w-full table table-auto table-pin-cols">
            <thead className="sticky top-0 z-10 bg-base-100 w-full">
              <tr className="text-base-content border-b-4 border-base-300">
                <td>
                  <p className="text-lg font-medium pe-36">Input</p>
                </td>
                <td className="flex flex-row gap-x-6 items-center pe-8">
                  <p className="text-lg font-medium">Output</p>
                  <div className="join">
                    <button
                      className={classNames(
                        "btn join-item btn-xs font-medium h-fit hover:bg-base-300/70 text-xs",
                        showRaw && "bg-base-300",
                        !showRaw && "bg-base-300/40"
                      )}
                      onClick={() => setShowRaw(true)}
                    >
                      Raw
                    </button>
                    <button
                      className={classNames(
                        "btn join-item btn-xs font-medium h-fit hover:bg-base-300/70 text-xs",
                        !showRaw && "bg-base-300",
                        showRaw && "bg-base-300/40"
                      )}
                      onClick={() => setShowRaw(false)}
                    >
                      Parsed
                    </button>
                  </div>
                </td>
                <td>
                  <p className="text-lg font-medium pe-36">Function call</p>
                </td>
                <td>
                  <p className="text-lg font-medium pe-6">Latency</p>
                </td>
                <td>
                  <p className="text-lg font-medium pe-6">Cost</p>
                </td>
                <td>
                  <p className="text-lg font-medium pe-6">Tokens</p>
                </td>
              </tr>
            </thead>
            <tbody className="bg-base-100">
              {runLogData?.map((runLog) => {
                return (
                  <tr className="border-b-2 border-base-300">
                    <td className="align-top">
                      {runLog?.inputs == null ? (
                        <p>None</p>
                      ) : typeof runLog?.inputs == "string" ? (
                        <p>{runLog?.inputs?.toString()}</p>
                      ) : (
                        <ReactJson
                          src={runLog?.inputs as Record<string, any>}
                          name={false}
                          displayDataTypes={false}
                          displayObjectSize={false}
                          enableClipboard={false}
                          theme="google"
                        />
                      )}
                    </td>
                    <td className="align-top">
                      {showRaw ? (
                        <p className="whitespace-break-spaces">
                          {runLog?.raw_output}
                        </p>
                      ) : typeof runLog?.parsed_outputs == "string" ||
                        runLog?.parsed_outputs == null ? (
                        <p>{runLog?.parsed_outputs?.toString()}</p>
                      ) : (
                        <ReactJson
                          src={runLog?.parsed_outputs as Record<string, any>}
                          name={false}
                          displayDataTypes={false}
                          displayObjectSize={false}
                          enableClipboard={false}
                          theme="google"
                        />
                      )}
                    </td>
                    <td className="align-top">
                      {runLog?.function_call == null ? (
                        <p>None</p>
                      ) : typeof runLog?.function_call == "string" ? (
                        <p>{runLog?.function_call?.toString()}</p>
                      ) : (
                        <ReactJson
                          src={runLog?.function_call as Record<string, any>}
                          name={false}
                          displayDataTypes={false}
                          displayObjectSize={false}
                          enableClipboard={false}
                          theme="google"
                        />
                      )}
                    </td>
                    <td className="align-top">{runLog.latency}s</td>
                    <td className="align-top">${runLog.cost}</td>
                    <td className="align-top">
                      {runLog.token_usage.total_tokens}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

function ModelVersionNode({ data }) {
  const {
    selectedPromptModelVersionUuid: selectedVersionUuid,
    setSelectedPromptModelVersionUuid: setSelectedVersionUuid,
  } = usePromptModelVersionStore();
  return (
    <div
      className={classNames(
        "bg-base-200 p-2 rounded-full flex justify-center items-center",
        "w-20 h-20 visible cursor-pointer",
        "transition-colors",
        selectedVersionUuid == data.uuid
          ? "border-neutral-content border-2"
          : "border-none",
        data.isPublished
          ? "bg-secondary/80 hover:bg-secondary/50"
          : "bg-base-200 hover:bg-blue-500/30"
      )}
      onClick={() => setSelectedVersionUuid(data.uuid)}
    >
      <Handle type="target" position={Position.Top} />
      <p className="text-base-content font-medium italic">
        V <span className="font-bold text-xl not-italic">{data.label}</span>
      </p>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}
