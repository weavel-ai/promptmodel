"use client";

import { Drawer } from "@/components/Drawer";
import { usePromptModelVersion } from "@/hooks/usePromptModelVersion";
import {
  Prompt,
  usePromptModelVersionStore,
} from "@/stores/promptModelVersionStore";
import classNames from "classnames";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactFlow, {
  Background,
  BackgroundVariant,
  Handle,
  Position,
} from "reactflow";
import { motion } from "framer-motion";
import {
  CaretDown,
  Command,
  GitBranch,
  Play,
  RocketLaunch,
  Trash,
  XCircle,
} from "@phosphor-icons/react";
import { toast } from "react-toastify";
import {
  updatePromptModelVersionMemo,
  updatePublishedPromptModelVersion,
} from "@/apis/promptModelVersion";
import { useSupabaseClient } from "@/apis/base";
import "reactflow/dist/style.css";
import { editor } from "monaco-editor";
import { useHotkeys } from "react-hotkeys-hook";
import { tree, stratify } from "d3-hierarchy";
import { useQueryClient } from "@tanstack/react-query";
import { ResizableSeparator } from "@/components/ResizableSeparator";
import { useProject } from "@/hooks/useProject";
import { SelectTab } from "@/components/SelectTab";
import { useDailyRunLogMetrics } from "@/hooks/analytics";
import { CustomAreaChart } from "@/components/charts/CustomAreaChart";
import { DatePickerWithRange } from "@/components/ui/DatePickerWithRange";
import { DateRange } from "react-day-picker";
import { subDays } from "date-fns";
import dayjs from "dayjs";
import { ParserTypeSelector } from "@/components/select/ParserTypeSelector";
import { Badge } from "@/components/ui/badge";
import {
  PromptDiffEditor,
  PromptEditor,
} from "@/components/editor/PromptEditor";
import { useWindowHeight, useWindowSize } from "@react-hook/window-size";
import { SampleSelector } from "@/components/SampleSelector";
import { ModelDisplay, ModelSelector } from "@/components/ModelSelector";
import { TagsInput } from "react-tag-input-component";
import { FunctionSelector } from "@/components/select/FunctionSelector";
import { NewPromptButton } from "@/components/buttons/NewPromptButton";
import { RunLogUI } from "@/components/RunLogUI";
import { SlashCommandOptions } from "@/components/select/SlashCommandOptions";
import { usePromptModel } from "@/hooks/usePromptModel";
import { Monaco, MonacoDiffEditor } from "@monaco-editor/react";
import { arePrimitiveListsEqual, cloneDeep, countStretchNodes } from "@/utils";
import { TagsSelector } from "@/components/select/TagsSelector";
import { ClickToEditInput } from "@/components/inputs/ClickToEditInput";
import { VersionTag } from "@/components/VersionTag";
import relativeTime from "dayjs/plugin/relativeTime";
dayjs.extend(relativeTime);

const initialNodes = [];
const initialEdges = [];

enum Tab {
  Analytics = "Analytics",
  Versions = "Versions",
}

const TABS = [Tab.Analytics, Tab.Versions];

export default function Page() {
  const [tab, setTab] = useState(Tab.Versions);
  const { promptModelData } = usePromptModel();
  const { promptModelVersionListData } = usePromptModelVersion();
  const { isCreateVariantOpen } = usePromptModelVersionStore();

  return (
    <div className="w-full h-full">
      {promptModelVersionListData?.length > 0 && !isCreateVariantOpen && (
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
  const [windowWidth, windowHeight] = useWindowSize();
  const { promptModelVersionListData } = usePromptModelVersion();
  const [nodes, setNodes] = useState(initialNodes);
  const [edges, setEdges] = useState(initialEdges);
  const [hoveredVersionData, setHoveredVersionData] = useState(null);
  const nodeTypes = useMemo(() => ({ modelVersion: ModelVersionNode }), []);
  const {
    focusedEditor,
    isCreateVariantOpen,
    selectedPromptModelVersion,
    setSelectedPromptModelVersion,
    selectedParser,
    outputKeys,
    setOutputKeys,
    showSlashOptions,
    setShowSlashOptions,
  } = usePromptModelVersionStore();
  const reactFlowRef = useRef(null);

  useEffect(() => {
    setSelectedPromptModelVersion(null);
  }, []);

  // Build nodes
  useEffect(() => {
    if (!promptModelVersionListData || promptModelVersionListData?.length === 0)
      return;

    const generatedEdges = [];
    const dataWithSyntheticRoot = [
      { version: "synthetic-root", from_version: null },
      ...promptModelVersionListData.map((item) => ({
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
    allNodes.forEach((node: any) => {
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
      .filter((node: any) => node.data.version !== "synthetic-root")
      .map((node: any) => {
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
  }, [promptModelVersionListData, windowWidth]);

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
          setSelectedPromptModelVersion(null);
        }}
        onNodeMouseEnter={onNodeMouseEnter}
        onNodeMouseLeave={onNodeMouseLeave}
      >
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
        {promptModelVersionListData && (
          <InitialVersionDrawer
            open={promptModelVersionListData?.length == 0}
          />
        )}
        <VersionDetailsDrawer open={selectedPromptModelVersion != null} />
        <VersionListDrawer
          open={isCreateVariantOpen && selectedPromptModelVersion != null}
        />
        <SlashCommandOptions
          open={Boolean(showSlashOptions)}
          setOpen={setShowSlashOptions}
          parsingType={selectedParser}
          onInsert={(outputFormatText: string, outputKey: string) => {
            const position = focusedEditor.getPosition();
            focusedEditor?.executeEdits("", [
              {
                range: {
                  startLineNumber: position.lineNumber,
                  startColumn: position.column,
                  endLineNumber: position.lineNumber,
                  endColumn: position.column,
                },
                text: outputFormatText, // The value you want to insert
              },
            ]);
            setShowSlashOptions(false);
            // Add output key
            setOutputKeys([...outputKeys, outputKey]);
            // Calculate new cursor position
            const newColumnPosition = position.column + outputFormatText.length;
            // Set cursor to the end of the inserted value
            focusedEditor.setPosition({
              lineNumber: position.lineNumber,
              column: newColumnPosition,
            });
            // Focus the editor
            focusedEditor.focus();
          }}
        />
      </ReactFlow>
      {hoveredVersionData && (
        <VersionInfoOverlay versionData={hoveredVersionData} />
      )}
    </>
  );
};

function VersionInfoOverlay({ versionData }) {
  const { promptModelData } = usePromptModel();
  const { promptModelVersionListData } = usePromptModelVersion();
  const hoveredVersionData = useMemo(() => {
    return promptModelVersionListData?.find(
      (version) => version.version == versionData.version
    );
  }, [versionData, promptModelVersionListData]);

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
        {promptModelData?.name}{" "}
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
  const { promptModelData } = usePromptModel();
  const { handleRun } = usePromptModelVersion();
  const [lowerBoxHeight, setLowerBoxHeight] = useState(240);

  const {
    modifiedPrompts,
    setModifiedPrompts,
    selectedSample,
    selectedModel,
    outputKeys,
    selectedParser,
    selectedFunctions,
    setSelectedSample,
    setOutputKeys,
    setSelectedModel,
    setSelectedParser,
    setSelectedFunctions,
  } = usePromptModelVersionStore();

  useEffect(() => {
    if (!open) return;
    setModifiedPrompts([]);
    setSelectedSample(null);
  }, [open]);

  return (
    <Drawer
      open={open}
      direction="right"
      classNames="!w-[100vw] px-4 flex flex-col justify-start items-center pb-4"
      duration={200}
    >
      {open && (
        <div className="flex flex-col justify-start w-full max-w-4xl h-full">
          <div className="flex flex-row justify-between items-center mb-2">
            <div className="flex flex-row justify-start items-center gap-x-4">
              <p className="text-2xl font-bold">{promptModelData?.name} V1</p>
            </div>
            <div className="flex flex-row w-fit justify-end items-center gap-x-2">
              <SampleSelector
                sampleName={selectedSample}
                setSample={setSelectedSample}
              />
              <ModelSelector
                modelName={selectedModel}
                setModel={setSelectedModel}
              />
              <button
                className="flex flex-row gap-x-2 items-center btn btn-outline btn-sm normal-case font-normal h-10 border-base-content hover:bg-base-content/20 disabled:bg-muted disabled:border-muted-content"
                onClick={() => handleRun(true)}
                disabled={
                  !(modifiedPrompts?.length > 0) ||
                  modifiedPrompts?.every?.((prompt) => prompt.content === "")
                }
              >
                <p className="text-base-content">Run</p>
                <Play className="text-base-content" size={20} weight="fill" />
              </button>
            </div>
          </div>
          <div className="bg-base-200 flex-grow w-full p-4 rounded-t-box overflow-auto">
            <div className="flex flex-row justify-between gap-x-2 items-start mb-2">
              <div className="flex flex-wrap justify-start gap-4 items-start w-full">
                <div className="flex flex-col items-start justify-start">
                  <label className="label text-xs font-medium">
                    <span className="label-text">Model</span>
                  </label>
                  <ModelSelector
                    modelName={selectedModel}
                    setModel={setSelectedModel}
                  />
                </div>
                <div className="flex flex-col items-start justify-start">
                  <label className="label text-xs font-medium">
                    <span className="label-text">Output parser type</span>
                  </label>
                  <ParserTypeSelector
                    parser={selectedParser}
                    selectParser={setSelectedParser}
                  />
                </div>
                <div className="flex flex-col items-start justify-start">
                  <label className="label text-xs font-medium">
                    <span className="label-text">Output keys</span>
                  </label>
                  {selectedParser && (
                    <div className="w-full bg-base-content/10 rounded-lg text-sm">
                      <TagsInput
                        value={outputKeys}
                        name="Output Keys"
                        classNames={{
                          input:
                            "text-sm m-0 flex-grow bg-transparent disabled",
                          tag: "!bg-secondary text-secondary-content text-sm",
                        }}
                        placeHolder="Type and press enter"
                        onChange={setOutputKeys}
                      />
                    </div>
                  )}
                  {(selectedParser == null || selectedParser == undefined) && (
                    <Badge className="text-sm" variant="muted">
                      No output keys
                    </Badge>
                  )}
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
              <div
                className="flex flex-row justify-end items-center tooltip tooltip-left tooltip-info"
                data-tip="Press Cmd + / to insert output format to your prompt"
              >
                <kbd className="kbd text-base-content">
                  <Command size={16} />
                </kbd>
                <kbd className="kbd text-base-content">/</kbd>
              </div>
            </div>
            <div className="divider" />
            <div className="flex flex-col h-full gap-y-2 justify-start items-center">
              {modifiedPrompts?.map?.((prompt, idx) => (
                <PromptComponent
                  key={idx}
                  prompt={prompt}
                  setPrompts={setModifiedPrompts}
                />
              ))}
              <NewPromptButton
                prompts={modifiedPrompts}
                setPrompts={setModifiedPrompts}
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
              <RunLogUI versionUuid={null} />
            </div>
          </div>
        </div>
      )}
    </Drawer>
  );
}

function VersionDetailsDrawer({ open }: { open: boolean }) {
  const { createSupabaseClient } = useSupabaseClient();
  const queryClient = useQueryClient();
  const { projectData } = useProject();
  const { promptModelData } = usePromptModel();
  const {
    handleRun,
    originalPromptListData,
    originalPromptModelVersionData,
    promptModelVersionListData,
    refetchPromptModelVersionListData,
    selectedPromptModelVersionUuid,
    isNewVersionReady,
  } = usePromptModelVersion();
  const {
    newVersionCache,
    fullScreenRunVersionUuid,
    isCreateVariantOpen,
    selectedSample,
    selectedModel,
    selectedFunctions,
    selectedParser,
    outputKeys,
    selectedPromptModelVersion,
    setOutputKeys,
    setSelectedSample,
    setSelectedFunctions,
    setSelectedModel,
    setSelectedParser,
    setSelectedPromptModelVersion,
    setIsCreateVariantOpen,
    setFullScreenRunVersionUuid,
    modifiedPrompts,
    setModifiedPrompts,
    showSlashOptions,
    setShowSlashOptions,
  } = usePromptModelVersionStore();
  const [lowerBoxHeight, setLowerBoxHeight] = useState(240);

  useHotkeys(
    "esc",
    () => {
      if (showSlashOptions) {
        setShowSlashOptions(false);
      } else if (fullScreenRunVersionUuid) {
        setFullScreenRunVersionUuid(null);
      } else if (isCreateVariantOpen) {
        setIsCreateVariantOpen(false);
      } else if (selectedPromptModelVersion) {
        setSelectedPromptModelVersion(null);
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

    const previousPublishedUuid = promptModelVersionListData?.find(
      (v) => v.is_published
    )?.uuid;

    await updatePublishedPromptModelVersion(
      await createSupabaseClient(),
      selectedPromptModelVersionUuid,
      previousPublishedUuid,
      projectData?.version,
      projectData?.uuid
    );
    await refetchPromptModelVersionListData();
    queryClient.invalidateQueries({
      predicate: (query: any) => query.queryKey[0] === "promptModelVersionData",
    });
    setSelectedPromptModelVersion(null);
    toast.update(toastId, {
      render: "Published successfully!",
      type: "success",
      isLoading: false,
      autoClose: 2000,
    });
  }

  async function handleSetMemo(newMemo: string) {
    await updatePromptModelVersionMemo(
      await createSupabaseClient(),
      selectedPromptModelVersionUuid,
      newMemo
    );
    queryClient.invalidateQueries([
      "promptModelVersionData",
      { uuid: selectedPromptModelVersionUuid },
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
                isCreateVariantOpen ? "w-1/2 pr-4" : "w-full"
              )}
            >
              <div className="flex flex-row gap-x-2 justify-start items-center">
                <p className="text-base-content font-bold text-lg">
                  {promptModelData?.name} <i>V</i>{" "}
                  {originalPromptModelVersionData?.version}
                </p>
                {originalPromptModelVersionData?.is_published &&
                  !isCreateVariantOpen && (
                    <div className="flex flex-row gap-x-2 items-center">
                      <div className="w-2 h-2 rounded-full bg-secondary" />
                      <p className="text-base-content font-medium text-sm">
                        Published
                      </p>
                    </div>
                  )}
                <div className="ml-2">
                  <TagsSelector
                    modelType="PromptModel"
                    versionUuid={selectedPromptModelVersionUuid}
                    previousTags={originalPromptModelVersionData?.tags}
                  />
                </div>
              </div>
              {isCreateVariantOpen ? (
                <div className="flex flex-row justify-end items-center gap-x-3">
                  <SampleSelector
                    sampleName={selectedSample}
                    setSample={setSelectedSample}
                  />
                  <button
                    className={classNames(
                      "flex flex-row gap-x-2 items-center btn btn-outline btn-sm normal-case font-normal h-10 bg-base-content hover:bg-base-content/80",
                      "text-base-100 disabled:bg-muted disabled:text-muted-content disabled:border-muted-content"
                    )}
                    onClick={() => {
                      handleRun(false);
                    }}
                  >
                    <p>Run</p>
                    <Play size={20} weight="fill" />
                  </button>
                </div>
              ) : (
                <div className="flex flex-row gap-x-2 items-center justify-end">
                  {!originalPromptModelVersionData?.is_published && (
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
                      setSelectedPromptModelVersion(null);
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
                <div className="flex flex-col items-start justify-center">
                  {isNewVersionReady || !newVersionCache ? (
                    <p className="text-base-content font-bold text-lg">
                      New Version
                    </p>
                  ) : (
                    <p className="text-base-content font-bold text-lg">
                      {promptModelData?.name} <i>V</i>{" "}
                      {newVersionCache?.version}
                    </p>
                  )}
                  <p className="text-base-content text-sm">
                    From&nbsp;
                    <u>V{originalPromptModelVersionData?.version}</u>
                  </p>
                </div>
                <div className="flex flex-row justify-end items-center gap-x-3">
                  <SampleSelector
                    sampleName={selectedSample}
                    setSample={setSelectedSample}
                  />
                  <button
                    className={classNames(
                      "flex flex-row gap-x-2 items-center btn btn-outline btn-sm normal-case font-normal h-10 bg-base-content hover:bg-base-content/80",
                      "text-base-100 disabled:bg-muted disabled:text-muted-content disabled:border-muted-content"
                    )}
                    onClick={() => {
                      handleRun(true);
                    }}
                    disabled={!isNewVersionReady && !newVersionCache}
                  >
                    <p>Run</p>
                    <Play size={20} weight="fill" />
                  </button>
                </div>
              </div>
            )}
          </div>
          {/* Prompt editor */}
          <motion.div className="bg-base-200 w-full p-4 rounded-t-box overflow-auto flex-grow">
            {isCreateVariantOpen ? (
              <div className="flex flex-row justify-between items-start">
                <div className="flex flex-wrap w-1/2 justify-start gap-4 items-start">
                  <div className="flex flex-col items-start justify-start">
                    <label className="label text-xs font-medium">
                      <span className="label-text">Model</span>
                    </label>
                    <ModelDisplay
                      modelName={originalPromptModelVersionData?.model}
                    />
                  </div>
                  <div className="min-w-fit flex flex-col items-start justify-start">
                    <label className="label text-xs font-medium">
                      <span className="label-text">Output parser type</span>
                    </label>
                    <ParserTypeSelector
                      parser={originalPromptModelVersionData?.parsing_type}
                    />
                  </div>
                  <div className="w-auto flex flex-col items-start justify-start">
                    <label className="label text-xs font-medium">
                      <span className="label-text">Output keys</span>
                    </label>
                    {originalPromptModelVersionData?.output_keys && (
                      <div className="w-full flex flex-row flex-wrap items-center gap-x-1 gap-y-2">
                        {originalPromptModelVersionData?.output_keys?.map(
                          (key) => (
                            <Badge
                              key={key}
                              className="text-sm"
                              variant="secondary"
                            >
                              {key}
                            </Badge>
                          )
                        )}
                      </div>
                    )}
                    {!originalPromptModelVersionData?.output_keys && (
                      <Badge className="text-sm" variant="muted">
                        No output keys
                      </Badge>
                    )}
                  </div>
                  <div className="w-auto flex flex-col items-start justify-start">
                    <label className="label text-xs font-medium">
                      <span className="label-text">Functions</span>
                    </label>
                    {originalPromptModelVersionData?.functions && (
                      <div className="w-full flex flex-row flex-wrap items-center gap-x-1 gap-y-2">
                        {originalPromptModelVersionData?.functions?.map(
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
                    {(!originalPromptModelVersionData?.functions ||
                      originalPromptModelVersionData?.functions?.length ==
                        0) && (
                      <Badge className="text-sm" variant="muted">
                        No functions
                      </Badge>
                    )}
                  </div>
                  <div className="w-auto flex flex-col items-start justify-start">
                    <label className="label text-xs font-medium">
                      <span className="label-text">Memo</span>
                    </label>
                    <ClickToEditInput
                      textarea
                      value={originalPromptModelVersionData?.memo}
                      setValue={handleSetMemo}
                      placeholder="Memo"
                    />
                  </div>
                </div>
                <div className="flex flex-wrap w-1/2 justify-start gap-4 items-start">
                  <div className="flex flex-col items-start justify-start">
                    <label className="label text-xs font-medium">
                      <span className="label-text">Model</span>
                    </label>
                    <ModelSelector
                      modelName={selectedModel}
                      setModel={setSelectedModel}
                    />
                  </div>
                  <div className="flex flex-col items-start justify-start">
                    <label className="label text-xs font-medium">
                      <span className="label-text">Output parser type</span>
                    </label>
                    <ParserTypeSelector
                      parser={selectedParser}
                      selectParser={setSelectedParser}
                    />
                  </div>
                  <div className="flex flex-col items-start justify-start">
                    <label className="label text-xs font-medium">
                      <span className="label-text">Output keys</span>
                    </label>
                    {selectedParser && (
                      <div className="w-full bg-base-content/10 rounded-lg text-sm">
                        <TagsInput
                          value={outputKeys}
                          name="Output Keys"
                          classNames={{
                            input:
                              "text-sm m-0 flex-grow bg-transparent disabled",
                            tag: "!bg-secondary text-secondary-content text-sm",
                          }}
                          placeHolder="Type and press enter"
                          onChange={setOutputKeys}
                        />
                      </div>
                    )}
                    {(selectedParser == null ||
                      selectedParser == undefined) && (
                      <Badge className="text-sm" variant="muted">
                        No output keys
                      </Badge>
                    )}
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
            ) : (
              <div className="flex flex-wrap justify-start gap-x-4 items-start mb-4">
                <div className="flex flex-col items-start justify-start">
                  <label className="label text-xs font-medium">
                    <span className="label-text">Model</span>
                  </label>
                  <ModelDisplay
                    modelName={originalPromptModelVersionData?.model}
                  />
                </div>
                <div className="min-w-fit flex flex-col items-start justify-start">
                  <label className="label text-xs font-medium">
                    <span className="label-text">Output parser type</span>
                  </label>
                  <ParserTypeSelector
                    parser={originalPromptModelVersionData?.parsing_type}
                  />
                </div>
                <div className="w-auto flex flex-col items-start justify-start">
                  <label className="label text-xs font-medium">
                    <span className="label-text">Output keys</span>
                  </label>
                  {originalPromptModelVersionData?.output_keys && (
                    <div className="w-full flex flex-row flex-wrap items-center gap-x-1 gap-y-2">
                      {originalPromptModelVersionData?.output_keys?.map(
                        (key) => (
                          <Badge
                            key={key}
                            className="text-sm"
                            variant="secondary"
                          >
                            {key}
                          </Badge>
                        )
                      )}
                    </div>
                  )}
                  {!originalPromptModelVersionData?.output_keys && (
                    <Badge className="text-sm" variant="muted">
                      No output keys
                    </Badge>
                  )}
                </div>
                <div className="w-auto flex flex-col items-start justify-start">
                  <label className="label text-xs font-medium">
                    <span className="label-text">Functions</span>
                  </label>
                  {originalPromptModelVersionData?.functions && (
                    <div className="w-full flex flex-row flex-wrap items-center gap-x-1 gap-y-2">
                      {originalPromptModelVersionData?.functions?.map(
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
                  {(!originalPromptModelVersionData?.functions ||
                    originalPromptModelVersionData?.functions?.length == 0) && (
                    <Badge className="text-sm" variant="muted">
                      No functions
                    </Badge>
                  )}
                </div>
                <div className="w-auto flex flex-col items-start justify-start">
                  <label className="label text-xs font-medium">
                    <span className="label-text">Memo</span>
                  </label>
                  <ClickToEditInput
                    textarea
                    value={originalPromptModelVersionData?.memo}
                    setValue={handleSetMemo}
                    placeholder="Memo"
                  />
                </div>
              </div>
            )}
            {isCreateVariantOpen && (
              <div className="flex flex-row justify-end items-center w-full my-4">
                <div
                  className="flex flex-row justify-end items-center tooltip tooltip-left tooltip-info w-fit"
                  data-tip="Press Cmd + / to insert output format to your prompt"
                >
                  <kbd className="kbd text-base-content">
                    <Command size={16} />
                  </kbd>
                  <kbd className="kbd text-base-content">/</kbd>
                </div>
              </div>
            )}
            <div className="flex flex-col gap-y-2 justify-start items-end">
              {originalPromptListData?.map((prompt, idx) =>
                isCreateVariantOpen ? (
                  <PromptDiffComponent
                    key={idx}
                    originalPrompt={prompt}
                    setModifiedPrompts={setModifiedPrompts}
                  />
                ) : (
                  <PromptComponent key={idx} prompt={prompt} />
                )
              )}
              {isCreateVariantOpen &&
                modifiedPrompts
                  ?.slice?.(originalPromptListData?.length)
                  .map?.((prompt, idx) => (
                    <div key={idx} className="w-1/2">
                      <PromptComponent
                        prompt={prompt}
                        setPrompts={setModifiedPrompts}
                      />
                    </div>
                  ))}
              {isCreateVariantOpen && (
                <div className="w-1/2 flex justify-center items-center">
                  <NewPromptButton
                    prompts={modifiedPrompts}
                    setPrompts={setModifiedPrompts}
                  />
                </div>
              )}
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
              <RunLogUI
                versionUuid={selectedPromptModelVersionUuid}
                className={classNames(isCreateVariantOpen && "!w-1/2")}
              />
              {isCreateVariantOpen && (
                <RunLogUI
                  versionUuid={newVersionCache?.uuid}
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
  const { promptModelVersionListData } = usePromptModelVersion();
  const {
    isCreateVariantOpen,
    selectedPromptModelVersion,
    newVersionCache,
    setIsCreateVariantOpen,
    setSelectedPromptModelVersion,
    setNewVersionCache,
  } = usePromptModelVersionStore();
  return (
    <Drawer open={open} direction="left" classNames="!w-[5rem] pl-2 relative">
      {isCreateVariantOpen && selectedPromptModelVersion != null && (
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
            {promptModelVersionListData?.map((versionData) => {
              return (
                <div
                  className={classNames(
                    "flex flex-row items-center gap-x-2 rounded-lg p-2 backdrop-blur-sm hover:bg-base-content/10 transition-all cursor-pointer relative",
                    "active:scale-90",
                    selectedPromptModelVersion === versionData.version
                      ? "bg-base-content/10"
                      : "bg-transparent",
                    newVersionCache?.version == versionData.version &&
                      "tooltip tooltip-bottom tooltip-info"
                  )}
                  data-tip="New!"
                  key={versionData.version}
                  onClick={() => {
                    setNewVersionCache(null);
                    setSelectedPromptModelVersion(versionData.version);
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
  prompt,
  setPrompts,
}: {
  prompt: Prompt;
  setPrompts?: (prompts) => void;
}) => {
  const windowHeight = useWindowHeight();
  const [open, setOpen] = useState(true);
  const [height, setHeight] = useState(30);
  const editorRef = useRef<editor.IStandaloneCodeEditor>(null);
  const { modifiedPrompts, setFocusedEditor, setShowSlashOptions } =
    usePromptModelVersionStore();

  const handleEditorDidMount = (editor: editor.IStandaloneCodeEditor) => {
    editor.onKeyDown((e) => {
      if (e.code === "Slash" && (e.ctrlKey || e.metaKey)) {
        setShowSlashOptions(true);
      }
    });
    editor.onDidFocusEditorWidget(() => {
      setFocusedEditor(editorRef.current);
    });
  };

  useEffect(() => {
    const contentHeight = editorRef.current?.getContentHeight();
    const maxHeight = windowHeight * 0.7;
    if (contentHeight) {
      setHeight(Math.min(contentHeight, maxHeight) + 20);
    }
  }, [editorRef.current?.getContentHeight()]);

  return (
    <motion.div
      key={prompt.step}
      className="w-full h-full flex flex-col justify-start items-center bg-base-100 rounded-box"
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
        <div className="flex flex-row gap-x-1 items-center">
          <button
            className="p-2 group"
            onClick={() => {
              const newPrompts = modifiedPrompts.filter(
                (p) => p.step !== prompt.step
              );
              setPrompts(
                newPrompts?.map((p, index) => ({
                  ...p,
                  step: index + 1,
                }))
              );
            }}
          >
            <Trash
              size={24}
              className="text-base-content transition-all group-hover:text-red-400 hover:font-bold"
            />
          </button>
          <CaretDown
            size={24}
            className={classNames(
              "text-base-content transition-transform shrink-0",
              open && "transform rotate-180"
            )}
          />
        </div>
      </div>
      {open && (
        <PromptEditor
          value={prompt.content}
          onChange={(value) => {
            if (setPrompts) {
              const newPrompts = [...modifiedPrompts];
              if (newPrompts.length < prompt.step) {
                newPrompts.push({
                  role: prompt.role,
                  step: prompt.step,
                  content: value,
                });
              } else {
                newPrompts[prompt.step - 1].content = value;
              }
              setPrompts(newPrompts);
            }
          }}
          options={{
            readOnly: setPrompts == undefined,
          }}
          loading={<div className="loading loading-xs loading-dots" />}
          onMount={handleEditorDidMount}
          height={height}
        />
      )}
    </motion.div>
  );
};

const PromptDiffComponent = ({ originalPrompt, setModifiedPrompts }) => {
  const windowHeight = useWindowHeight();
  const [open, setOpen] = useState(true);
  const [height, setHeight] = useState(30);
  const originalEditorRef = useRef<editor.IStandaloneCodeEditor>(null);
  const modifiedEditorRef = useRef<editor.IStandaloneCodeEditor>(null);
  const { setFocusedEditor, modifiedPrompts, setShowSlashOptions } =
    usePromptModelVersionStore();
  const modifiedPromptsRef = useRef(modifiedPrompts);

  useEffect(() => {
    modifiedPromptsRef.current = modifiedPrompts; // Keep a reference to the latest modifiedPrompts
  }, [modifiedPrompts]);

  const handleEditorDidMount = (editor: MonacoDiffEditor, monaco: Monaco) => {
    originalEditorRef.current = editor.getOriginalEditor();
    modifiedEditorRef.current = editor.getModifiedEditor();
    modifiedEditorRef.current?.onKeyDown((e) => {
      if (e.code === "Slash" && (e.ctrlKey || e.metaKey)) {
        setShowSlashOptions(true);
      }
    });
    modifiedEditorRef.current?.onDidFocusEditorWidget(() => {
      setFocusedEditor(modifiedEditorRef.current);
    });

    modifiedEditorRef.current.onDidChangeModelContent(
      (e: editor.IModelContentChangedEvent) => {
        const newPrompts = [...modifiedPromptsRef.current];

        if (newPrompts.length < originalPrompt.step) {
          newPrompts.push({
            role: originalPrompt.role,
            step: originalPrompt.step,
            content: modifiedEditorRef.current?.getValue(),
          });
        } else {
          newPrompts[originalPrompt.step - 1].content =
            modifiedEditorRef.current?.getValue();
        }
        setModifiedPrompts(newPrompts);
        // Set height
        const originalHeight = originalEditorRef.current?.getContentHeight();
        const modifiedHeight = modifiedEditorRef.current?.getContentHeight();
        const maxHeight = windowHeight * 0.7;
        if (modifiedHeight > originalHeight) {
          setHeight(Math.min(modifiedHeight, maxHeight) + 20);
        } else {
          setHeight(Math.min(originalHeight, maxHeight) + 20);
        }
      }
    );
  };

  useEffect(() => {
    // Set height
    const originalHeight = originalEditorRef.current?.getContentHeight();
    const modifiedHeight = modifiedEditorRef.current?.getContentHeight();
    const maxHeight = windowHeight * 0.7;
    if (modifiedHeight > originalHeight) {
      setHeight(Math.min(modifiedHeight, maxHeight) + 20);
    } else {
      setHeight(Math.min(originalHeight, maxHeight) + 20);
    }
  }, [open]);

  return (
    <motion.div
      key={originalPrompt.step}
      className="w-full h-full flex flex-col justify-start items-center bg-base-100 rounded-box"
      animate={{ height: open ? "auto" : "2.5rem" }}
    >
      <div
        className={classNames(
          "w-full h-10 min-h-[2.5rem] flex flex-row justify-between items-center py-1 px-3 cursor-pointer"
        )}
        onClick={() => setOpen(!open)}
      >
        <p className="text-base-content font-semibold">
          #{originalPrompt.step}. {originalPrompt.role}
        </p>
        <CaretDown
          className={classNames(
            "text-base-content transition-transform",
            open && "transform rotate-180"
          )}
        />
      </div>
      {open && (
        <PromptDiffEditor
          className="gap-x-8"
          original={originalPrompt.content}
          modified={originalPrompt.content}
          loading={<div className="loading loading-xs loading-dots" />}
          onMount={handleEditorDidMount}
          height={height}
        />
      )}
    </motion.div>
  );
};

function ModelVersionNode({ data }) {
  const {
    selectedPromptModelVersion,
    setSelectedPromptModelVersion,
    setNewVersionCache,
  } = usePromptModelVersionStore();

  function handleNodeClick() {
    setNewVersionCache(null);
    setSelectedPromptModelVersion(data.version);
  }

  return (
    <div
      className={classNames(
        "bg-base-200 p-2 rounded-full flex justify-center items-center",
        "w-20 h-20 visible cursor-pointer",
        "transition-colors",
        selectedPromptModelVersion == data.version
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
