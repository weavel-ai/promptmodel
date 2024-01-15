import { Play, X } from "@phosphor-icons/react";
import { Modal } from "./Modal";
import { useFunctionModelDatasets } from "@/hooks/useFunctionModelDatasets";
import { useMemo, useState } from "react";
import classNames from "classnames";
import { useFunctionModelVersionDetails } from "@/hooks/useFunctionModelVersionDetails";
import { startFunctionModelVersionBatchRun } from "@/apis/function_model_versions/startBatchRun";
import { useProject } from "@/hooks/useProject";
import { useBatchRunLogs } from "@/hooks/useBatchRunLogs";
import dayjs from "dayjs";
import ReactJson from "react-json-view";
import { BatchRun } from "@/types/BatchRun";
import { Dataset } from "../../types/SampleInput";

interface BatchRunLogModalProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  batchRun: BatchRun;
}

export function BatchRunLogModal({
  isOpen,
  setIsOpen,
  batchRun,
}: BatchRunLogModalProps) {
  const { batchRunLogListQuery } = useBatchRunLogs(batchRun?.uuid);
  const { findDataset } = useFunctionModelDatasets();
  const [showRaw, setShowRaw] = useState(false);

  const dataset = useMemo(() => {
    if (!batchRun) return null;

    return findDataset(batchRun?.dataset_uuid);
  }, [batchRun, findDataset]);

  return (
    <Modal isOpen={isOpen} setIsOpen={setIsOpen}>
      <div className="bg-popover/90 backdrop-blur-sm p-6 rounded-box flex flex-col gap-y-2 w-[90vw] h-[90vh]">
        <div className="flex flex-row justify-between items-center">
          <p className="text-xl font-semibold">Batch run logs</p>
          <button
            className="p-2 rounded-full hover:bg-base-content/20 transition-colors"
            onClick={() => setIsOpen(false)}
          >
            <X size={24} />
          </button>
        </div>
        <div className="flex flex-row justify-between items-center">
          <div className="flex flex-col items-start w-1/2">
            <p className="text-base-content/80">
              <span className="text-muted-content font-medium pr-3">Score</span>
              <span className="text-lg font-semibold text-secondary">
                {batchRun?.score == null ? "-" : batchRun?.score}
              </span>
            </p>
            <p className="text-base-content/80">
              <span className="text-muted-content font-medium pr-3">
                Status
              </span>
              {batchRun?.status}
            </p>
            <p className="text-base-content/80">
              <span className="text-muted-content font-medium pr-3">
                Started
              </span>
              {dayjs(batchRun?.created_at).format("YYYY-MM-DD HH:mm:ss")}
            </p>
            <p className="text-base-content/80">
              <span className="text-muted-content font-medium pr-3">
                Finished
              </span>
              {dayjs(batchRun?.finished_at).format("YYYY-MM-DD HH:mm:ss")}
            </p>
          </div>
          <div className="flex flex-col items-start w-1/2">
            <p className="text-base-content/80 text-lg font-semibold">
              Dataset
            </p>
            <p className="text-base-content/80">
              <span className="text-muted-content font-medium pr-3">Name</span>
              {dataset?.dataset_name}
            </p>
            <p className="text-base-content/80">
              <span className="text-muted-content font-medium pr-3">
                Description
              </span>
              {dataset?.dataset_description || "No description"}
            </p>
          </div>
        </div>
        <div className="w-full h-full overflow-auto mt-2">
          <table className="table">
            <thead className="bg-base-100 top-0 z-10 sticky">
              <tr className="text-base-content text-base">
                <th>Created</th>
                <th>Input</th>
                <th className="flex flex-row gap-x-6 items-center">
                  <p className="font-medium ps-1">Output</p>
                  <div className="join">
                    <button
                      className={classNames(
                        "btn join-item btn-xs font-medium h-fit hover:bg-base-content/20 text-xs",
                        showRaw && "bg-base-content/80 text-base-100",
                        !showRaw && "bg-base-300/40"
                      )}
                      onClick={() => setShowRaw(true)}
                    >
                      Raw
                    </button>
                    <button
                      className={classNames(
                        "btn join-item btn-xs font-medium h-fit hover:bg-base-content/20 text-xs",
                        !showRaw && "bg-base-content/80 text-base-100",
                        showRaw && "bg-base-300/40"
                      )}
                      onClick={() => setShowRaw(false)}
                    >
                      Parsed
                    </button>
                  </div>
                </th>
                <th>Latency</th>
                <th>Cost</th>
                <th>Total tokens</th>
                <th>Score</th>
                <th>Eval metric</th>
              </tr>
            </thead>
            <tbody>
              {batchRunLogListQuery?.isLoading && (
                <tr>
                  <td colSpan={6} className="text-center">
                    <div className="loading" />
                  </td>
                </tr>
              )}
              {batchRunLogListQuery?.data?.length == 0 && (
                <tr>
                  <td colSpan={8} className="text-center">
                    <p className="text-base-content">No logs</p>
                  </td>
                </tr>
              )}
              {batchRunLogListQuery?.data?.map((runLog) => (
                <tr key={runLog.id}>
                  <td className="align-top">
                    {dayjs(runLog.created_at).format("YYYY-MM-DD HH:mm:ss")}
                  </td>
                  <td className="align-top">
                    <ReactJson
                      src={runLog.inputs}
                      name={false}
                      displayDataTypes={false}
                      displayObjectSize={false}
                      enableClipboard={false}
                      theme="harmonic"
                    />
                  </td>
                  <td className="align-top w-fit">
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
                        theme="harmonic"
                      />
                    )}
                  </td>
                  <td className="align-top">{runLog.latency}ms</td>
                  <td className="align-top">${runLog.cost}</td>
                  <td className="align-top">{runLog.total_tokens}</td>
                  <td className="align-top">{runLog.score}</td>
                  <td className="align-top">{runLog.eval_metric_name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Modal>
  );
}
