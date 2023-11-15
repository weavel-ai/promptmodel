"use client";

import { useProject } from "@/hooks/useProject";
import { useEffect, useState } from "react";
import classNames from "classnames";
import { ArrowLeft, CornersOut } from "@phosphor-icons/react";
import ReactJson from "react-json-view";
import {
  fetchRunLogs,
  fetchRunLogsCount,
  subscribeRunLogs,
} from "@/apis/runlog";
import { useSupabaseClient } from "@/apis/base";
import { useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";
import { ArrowRight } from "lucide-react";

const ROWS_PER_PAGE = 50;

export default function Page() {
  const { projectData, projectUuid } = useProject();
  const { createSupabaseClient } = useSupabaseClient();
  const [page, setPage] = useState(1);
  const [isRealtime, setIsRealtime] = useState(false);

  const { data: runLogsCountData, refetch: refetchRunLogsCountData } = useQuery(
    {
      queryKey: ["runLogsCount", { projectUuid: projectData?.uuid }],
      queryFn: async () =>
        await fetchRunLogsCount(
          await createSupabaseClient(),
          projectData?.uuid
        ),
      enabled: !!projectData?.uuid,
    }
  );

  const {
    data: runLogListData,
    refetch: refetchRunLogListData,
    isLoading: isRunLogLoading,
  } = useQuery({
    queryKey: ["runLogList", { projectUuid: projectData?.uuid, page: page }],
    queryFn: async () =>
      await fetchRunLogs(
        await createSupabaseClient(),
        projectData?.uuid,
        page,
        ROWS_PER_PAGE
      ),
    enabled: !!projectData?.uuid,
  });

  // Subscribe run logs
  useEffect(() => {
    if (!projectUuid) return;
    if (isRealtime) {
      createSupabaseClient().then(async (client) => {
        const runLogsStream = await subscribeRunLogs(
          client,
          projectUuid,
          () => {
            refetchRunLogsCountData();
            refetchRunLogListData();
          }
        );
        // Cleanup function that will be called when the component unmounts or when isRealtime becomes false
        return () => {
          if (runLogsStream) {
            runLogsStream.unsubscribe();
            client.removeChannel(runLogsStream);
          }
        };
      });
    }
  }, [projectUuid, isRealtime]);

  return (
    <div className="w-full h-full pl-20 overflow-hidden">
      <div className="w-full h-full flex flex-col pt-16">
        {/* TODO: ADD FILTERS */}
        <div className="w-full flex flex-row justify-between items-center px-2 pb-2">
          {/* <p className="text-lg font-medium text-base-content">Filter</p> */}
          <div className="w-full flex flex-row justify-end gap-x-4 mr-4">
            <p>Realtime</p>
            <input
              type="checkbox"
              className="toggle toggle-info"
              checked={isRealtime}
              onChange={(e) => setIsRealtime(e.target.checked)}
            />
          </div>
        </div>
        <RunLogComponent
          runLogData={runLogListData}
          isFullScreen={false}
          setIsFullScreen={() => {}}
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
            of {Math.ceil(runLogsCountData?.run_logs_count / ROWS_PER_PAGE)}
          </p>
          <button
            className="btn btn-outline btn-xs mr-2"
            onClick={() => {
              if (
                page <
                Math.ceil(runLogsCountData?.run_logs_count / ROWS_PER_PAGE)
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
            Total {runLogsCountData?.run_logs_count} runs
          </p>
        </div>
      </div>
    </div>
  );
}

const RunLogComponent = ({ runLogData, isFullScreen, setIsFullScreen }) => {
  const [showRaw, setShowRaw] = useState(true);

  return (
    <div
      className={classNames(
        "w-full max-h-full flex-grow-1 items-center bg-base-200 p-2 flex flex-col gap-y-2 justify-start",
        isFullScreen && "h-full"
      )}
      style={{ height: !isFullScreen && "calc(100% - 5rem)" }}
    >
      <div
        className={classNames(
          "w-full max-h-full bg-base-200 rounded-t",
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
                  <p className="text-lg font-medium">PromptModel</p>
                </td>
                <td>
                  <p className="text-lg font-medium">Version</p>
                </td>
                <td>
                  <p className="text-lg font-medium">Timestamp</p>
                </td>
                <td>
                  <p className="text-lg font-medium">Input</p>
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
                    <td className="align-top">{runLog.prompt_model_name}</td>
                    <td className="align-top text-lg">
                      {runLog.prompt_model_version}
                    </td>
                    <td className="align-top">
                      {dayjs(runLog.created_at).format("YYYY. MM. DD HH:mm:ss")}
                    </td>
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
