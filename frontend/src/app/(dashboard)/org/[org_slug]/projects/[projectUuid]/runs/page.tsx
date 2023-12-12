"use client";

import { useProject } from "@/hooks/useProject";
import { useEffect, useState, useCallback } from "react";
import classNames from "classnames";
import { ArrowLeft, ArrowRight, CloudArrowDown } from "@phosphor-icons/react";
import ReactJson from "react-json-view";
import { subscribeRunLogs } from "@/apis/runlog";
import { useSupabaseClient } from "@/apis/supabase";
import { useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";
import { CSVLink } from "react-csv";
import { SelectTab } from "@/components/SelectTab";
import { cloneDeep, escapeCSV } from "@/utils";
import { useRunLogCount } from "@/hooks/useRunLogCount";
import { useChatLogCount } from "@/hooks/useChatMessagesCount";
import { fetchProjectChatMessages } from "@/apis/chat_messages";
import { subscribeChatLogs } from "@/apis/chatLog";
import { fetchProjectRunLogs } from "@/apis/run_logs";
import { subscribeTable } from "@/apis/subscribe";

const ROWS_PER_PAGE = 50;

enum Tab {
  FUNCTION_MODEL = "FunctionModel",
  CHAT_MODEL = "ChatModel",
}

const TABS = [Tab.FUNCTION_MODEL, Tab.CHAT_MODEL];

const CHAT_CSV_HEADERS = [
  { label: "ChatModel Name", key: "chat_model_name" },
  { label: "Version", key: "chat_model_version" },
  { label: "Version UUID", key: "chat_model_version_uuid" },
  { label: "Timestamp", key: "created_at" },
  { label: "User input", key: "user_input" },
  { label: "Assistant output", key: "assistant_output" },
  { label: "Tool calls", key: "tool_calls" },
  // { label: "Latency", key: "latency" },
  // { label: "Cost", key: "cost" },
  // { label: "Tokens", key: "token_usage.total_tokens" },
];

export default function Page() {
  const { projectData, projectUuid } = useProject();
  const { supabase } = useSupabaseClient();
  const [page, setPage] = useState(1);
  const [isRealtime, setIsRealtime] = useState(false);
  const [selectedTab, setSelectedTab] = useState(Tab.FUNCTION_MODEL);

  const { runLogCountData, refetchRunLogCountData } = useRunLogCount();
  const {
    data: runLogListData,
    refetch: refetchRunLogListData,
    isLoading: isRunLogLoading,
  } = useQuery({
    queryKey: ["runLogList", { projectUuid: projectData?.uuid, page: page }],
    queryFn: async () =>
      await fetchProjectRunLogs({
        project_uuid: projectData?.uuid,
        page: page,
        rows_per_page: ROWS_PER_PAGE,
      }),
    enabled: !!projectData?.uuid,
  });

  const {
    chatMessagesCountData: chatLogCountData,
    refetchChatMessagesCountData: refetchChatLogCountData,
  } = useChatLogCount();

  const {
    data: chatLogListData,
    refetch: refetchChatLogListData,
    isLoading: isChatLogLoading,
  } = useQuery({
    queryKey: ["chatLogList", { projectUuid: projectData?.uuid, page: page }],
    queryFn: async () =>
      await fetchProjectChatMessages({
        project_uuid: projectData?.uuid,
        page: page,
        rows_per_page: ROWS_PER_PAGE,
      }),
    enabled: !!projectData?.uuid,
  });

  const subscribeToRunLogs = useCallback(async () => {
    if (!projectUuid) return;

    const runLogsStream: WebSocket = await subscribeTable({
      tableName: "run_log",
      project_uuid: projectUuid,
      onMessage(message: any) {
        refetchRunLogCountData();
        refetchRunLogListData();
      },
    });
    console.log("runLogsStream", runLogsStream);
    console.log(!!runLogsStream);

    // Cleanup function
    return () => {
      if (!!runLogsStream) {
        runLogsStream.close();
      }
    };
  }, [
    projectUuid,
    subscribeTable,
    refetchRunLogCountData,
    refetchRunLogListData,
  ]);

  const subscribeToChatLogs = useCallback(async () => {
    if (!projectUuid) return;

    const chatLogsStream: WebSocket = await subscribeTable({
      tableName: "chat_log",
      project_uuid: projectUuid,
      onMessage(message: any) {
        refetchChatLogCountData();
        refetchChatLogListData();
      },
    });

    // Cleanup function
    return () => {
      if (!!chatLogsStream) {
        chatLogsStream.close();
      }
    };
  }, [
    projectUuid,
    subscribeTable,
    refetchChatLogCountData,
    refetchChatLogListData,
  ]);

  useEffect(() => {
    let runLogsCleanupFunction;
    let chatLogsCleanupFunction;
    if (isRealtime) {
      subscribeToRunLogs().then((cleanup) => {
        runLogsCleanupFunction = cleanup;
      });
      subscribeToChatLogs().then((cleanup) => {
        chatLogsCleanupFunction = cleanup;
      });
    }

    return () => {
      if (selectedTab == Tab.FUNCTION_MODEL) {
        if (runLogsCleanupFunction) runLogsCleanupFunction();
      } else {
        if (chatLogsCleanupFunction) chatLogsCleanupFunction();
      }
    };
  }, [isRealtime, subscribeToRunLogs, subscribeToChatLogs]);

  return (
    <div className="w-full h-full pl-20 overflow-hidden">
      <div className="w-full h-full flex flex-col pt-16">
        {/* TODO: ADD FILTERS */}
        <div className="w-full flex flex-row justify-between items-center px-2 pb-2">
          {/* <p className="text-lg font-medium text-base-content">Filter</p> */}
          <SelectTab
            tabs={TABS}
            selectedTab={selectedTab}
            onSelect={(newTab) => setSelectedTab(newTab as Tab)}
          />
          <div className="w-full flex flex-row justify-end gap-x-4 mr-4 items-center">
            {selectedTab == Tab.CHAT_MODEL && chatLogListData && (
              <CSVLink
                data={cloneDeep(chatLogListData)?.map((log) => {
                  log.user_input = escapeCSV(log.user_input);
                  log.assistant_output = escapeCSV(log.assistant_output);
                  return log;
                })}
                filename={`${projectData?.name}_chat_logs.csv`}
                headers={CHAT_CSV_HEADERS}
                className={classNames(
                  "rounded-full transition-colors p-2 hover:bg-neutral-content/20 tooltip tooltip-left tooltip-secondary"
                )}
                enclosingCharacter=""
                data-tip="Download CSV"
              >
                <CloudArrowDown size={24} weight="bold" className="shrink-0" />
                {/* <p className="shrink-0">Download CSV</p> */}
              </CSVLink>
            )}
            <p>Realtime</p>
            <input
              type="checkbox"
              className="toggle toggle-info"
              checked={isRealtime}
              onChange={(e) => setIsRealtime(e.target.checked)}
            />
          </div>
        </div>
        <LogsUI
          logData={
            selectedTab == Tab.FUNCTION_MODEL ? runLogListData : chatLogListData
          }
          type={selectedTab}
        />
        <div className="w-full min-h-fit flex flex-row justify-start items-center p-2 bg-base-200 rounded-b text-sm gap-x-2">
          <button
            className="btn btn-outline btn-xs"
            onClick={() => {
              if (page > 1) {
                setPage(page - 1);
              }
            }}
          >
            <ArrowLeft size={20} />
          </button>
          <p>Page</p>
          <input
            type="number"
            value={page}
            onChange={(e) => setPage(parseInt(e.target.value))}
            className="input bg-input input-xs w-[3rem] text-center flex-shrink focus:outline-none active:outline-none"
          />
          <p className="flex-shrink-0">
            of{" "}
            {Math.ceil(
              (selectedTab == Tab.FUNCTION_MODEL
                ? runLogCountData?.count
                : chatLogCountData?.count) / ROWS_PER_PAGE
            )}
          </p>
          <button
            className="btn btn-outline btn-xs mr-2"
            onClick={() => {
              if (
                page <
                Math.ceil(
                  (selectedTab == Tab.FUNCTION_MODEL
                    ? runLogCountData?.count
                    : chatLogCountData?.count) / ROWS_PER_PAGE
                )
              ) {
                setPage(page + 1);
              }
            }}
          >
            <ArrowRight size={20} />
          </button>
          {isRunLogLoading ? (
            <div className="loading loading-spinner loading-sm" />
          ) : (
            <p className="">{ROWS_PER_PAGE} records</p>
          )}
          <div className="divider divider-horizontal" />
          <p className="text-muted-content">
            Total{" "}
            {selectedTab == Tab.FUNCTION_MODEL
              ? runLogCountData?.count
              : chatLogCountData?.count}{" "}
            runs
          </p>
        </div>
      </div>
    </div>
  );
}

const LogsUI = ({ logData, type }) => {
  const [showRaw, setShowRaw] = useState(true);

  const isFunctionModel = type == "FunctionModel";

  return (
    <div
      className={classNames(
        "w-full max-h-full flex-grow-1 items-center bg-base-200 p-2 flex flex-col gap-y-2 justify-start"
      )}
      style={{ height: "calc(100% - 5rem)" }}
    >
      <div
        className={classNames(
          "w-full max-h-full bg-base-200 rounded-t overflow-auto"
        )}
      >
        <div className={classNames("w-full h-full")}>
          <table className="w-full table table-auto table-pin-cols">
            <thead className="sticky top-0 z-10 bg-base-100 w-full">
              <tr className="text-base-content border-b-4 border-base-300">
                <td>
                  <p className="text-lg font-medium">Name</p>
                </td>
                <td>
                  <p className="text-lg font-medium">Version</p>
                </td>
                <td>
                  <p className="text-lg font-medium">Timestamp</p>
                </td>
                <td>
                  <p className="text-lg font-medium">
                    {isFunctionModel ? "Input" : "User input"}
                  </p>
                </td>
                <td className="flex flex-row gap-x-6 items-center pe-8">
                  <p className="text-lg font-medium">
                    {isFunctionModel ? "Output" : "Assistant output"}
                  </p>
                  {isFunctionModel && (
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
                  )}
                </td>
                <td>
                  <p className="text-lg font-medium pe-36">Tool calls</p>
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
              {logData?.map((log, idx) => {
                return (
                  <tr key={idx} className="border-b-2 border-base-300">
                    <td className="align-top">
                      {isFunctionModel
                        ? log.function_model_name
                        : log.chat_model_name}
                    </td>
                    <td className="align-top text-lg">
                      {isFunctionModel
                        ? log.function_model_version
                        : log.chat_model_version}
                    </td>
                    <td className="align-top">
                      {dayjs(log.created_at).format("YYYY. MM. DD HH:mm:ss")}
                    </td>
                    {isFunctionModel ? (
                      <td className="align-top">
                        {log?.inputs == null ? (
                          <p>None</p>
                        ) : typeof log?.inputs == "string" ? (
                          <p>{log?.inputs?.toString()}</p>
                        ) : (
                          <ReactJson
                            src={log?.inputs as Record<string, any>}
                            name={false}
                            displayDataTypes={false}
                            displayObjectSize={false}
                            enableClipboard={false}
                            theme="google"
                          />
                        )}
                      </td>
                    ) : (
                      <td className="align-top">{log?.user_input}</td>
                    )}
                    {isFunctionModel ? (
                      <td className="align-top">
                        {showRaw ? (
                          <p className="whitespace-break-spaces">
                            {log?.raw_output}
                          </p>
                        ) : typeof log?.parsed_outputs == "string" ||
                          log?.parsed_outputs == null ? (
                          <p>{log?.parsed_outputs?.toString()}</p>
                        ) : (
                          <ReactJson
                            src={log?.parsed_outputs as Record<string, any>}
                            name={false}
                            displayDataTypes={false}
                            displayObjectSize={false}
                            enableClipboard={false}
                            theme="google"
                          />
                        )}
                      </td>
                    ) : (
                      <td className="align-top">{log?.assistant_output}</td>
                    )}
                    {isFunctionModel ? (
                      <td className="align-top">
                        {log?.function_call == null ? (
                          <p>None</p>
                        ) : typeof log?.function_call == "string" ? (
                          <p>{log?.function_call?.toString()}</p>
                        ) : (
                          <ReactJson
                            src={log?.function_call as Record<string, any>}
                            name={false}
                            displayDataTypes={false}
                            displayObjectSize={false}
                            enableClipboard={false}
                            theme="google"
                          />
                        )}
                      </td>
                    ) : (
                      <td className="align-top">
                        {log?.tool_calls == null ? (
                          <p>None</p>
                        ) : typeof log?.tool_calls == "string" ? (
                          <p>{log?.tool_calls?.toString()}</p>
                        ) : (
                          <ReactJson
                            src={log?.tool_calls as Record<string, any>}
                            name={false}
                            displayDataTypes={false}
                            displayObjectSize={false}
                            enableClipboard={false}
                            theme="google"
                          />
                        )}
                      </td>
                    )}
                    <td className="align-top">
                      {log?.latency ? `${log?.latency}s` : "-"}
                    </td>
                    <td className="align-top">
                      {log?.cost ? `$${log?.cost}` : "-"}
                    </td>
                    <td className="align-top">
                      {log?.token_usage?.total_tokens}
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
