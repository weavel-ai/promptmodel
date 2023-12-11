import { RunLog } from "@/types/RunLog";
import { useRunLogs } from "@/hooks/useRunLog";
import { useFunctionModelVersionStore } from "@/stores/functionModelVersionStore";
import { CornersOut } from "@phosphor-icons/react";
import classNames from "classnames";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ModalPortal } from "./ModalPortal";
import ReactJson from "react-json-view";

export function RunLogUI({
  versionUuid,
  className,
}: {
  versionUuid: string | null;
  className?: string;
}) {
  // const [showRaw, setShowRaw] = useState(true);
  const { runLogData } = useRunLogs(versionUuid);
  const {
    runTasksCount,
    runLogs,
    fullScreenRunVersionUuid,
    setFullScreenRunVersionUuid,
  } = useFunctionModelVersionStore();
  const [runLogList, setRunLogList] = useState<RunLog[]>([]);

  useEffect(() => {
    if (
      runTasksCount == null ||
      runLogData == undefined ||
      runLogData == null ||
      !versionUuid
    ) {
      setRunLogList([]);
      return;
    }
    let updatedRunLogList = [];

    if (runLogData?.length > 0) {
      updatedRunLogList = [
        ...runLogData.map((log) => {
          let parsedInputs, parsedOutputs;
          try {
            parsedInputs = log.inputs;
          } catch (e) {
            parsedInputs = log.inputs;
          }
          try {
            parsedOutputs = log.parsed_outputs;
          } catch (e) {
            parsedOutputs = log.parsed_outputs;
          }
          return {
            inputs: parsedInputs,
            raw_output: log.raw_output,
            parsed_outputs: parsedOutputs,
            function_call: log.function_call,
          };
        }),
      ];
    }
    if (runLogs[versionUuid]) {
      updatedRunLogList.unshift(...Object.values(runLogs[versionUuid]));
    }

    setRunLogList(updatedRunLogList);
  }, [versionUuid, runLogData, runTasksCount, runLogs]);

  const mainUI = (
    <div className="w-full h-full flex flex-col gap-y-2">
      <div className="w-full flex flex-row justify-between items-center">
        <p className="text-xl font-semibold ps-2">Run Log</p>
        {versionUuid != null && (
          <button
            className="btn btn-sm bg-transparent border-transparent items-center hover:bg-neutral-content/20"
            onClick={() => {
              if (fullScreenRunVersionUuid == versionUuid) {
                setFullScreenRunVersionUuid(null);
                return;
              }
              setFullScreenRunVersionUuid(versionUuid);
            }}
          >
            <CornersOut size={22} />
            {fullScreenRunVersionUuid == versionUuid && (
              <kbd className="kbd">Esc</kbd>
            )}
          </button>
        )}
      </div>
      <RunLogTable runLogList={runLogList} />
    </div>
  );

  if (fullScreenRunVersionUuid != versionUuid || versionUuid == null) {
    return (
      <div
        className={classNames(
          "w-full h-full rounded-box bg-base-200 p-4",
          className
        )}
      >
        {mainUI}
      </div>
    );
  } else {
    return (
      <ModalPortal>
        <motion.div
          className="fixed bottom-0 right-0 z-[999999] bg-base-200/70 backdrop-blur-md p-4 flex justify-center items-center"
          initial={{ width: "50vw", height: "40vh" }}
          animate={{
            width: "100vw",
            height: "100vh",
          }}
        >
          <div className="max-w-5xl w-full h-full">{mainUI}</div>
        </motion.div>
      </ModalPortal>
    );
  }
}

const RunLogTable = ({ runLogList }) => {
  const [showRaw, setShowRaw] = useState(true);

  return (
    <div className="overflow-auto">
      <table className="w-full table table-pin-cols">
        <thead className="sticky top-0 z-10 bg-base-100 w-full">
          <tr className="text-base-content">
            <th className="w-fit">
              <p className="text-lg font-medium ps-1">Input</p>
            </th>
            <th className="flex flex-row gap-x-6 items-center">
              <p className="text-lg font-medium ps-1">Output</p>
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
            </th>
            <th>
              <p className="text-lg font-medium ps-1">Function call</p>
            </th>
          </tr>
        </thead>
        <tbody className="bg-base-100">
          {runLogList?.map((log, idx) => (
            <RunLogComponent key={idx} showRaw={showRaw} runLogData={log} />
          ))}
        </tbody>
      </table>
    </div>
  );
};

const RunLogComponent = ({
  showRaw,
  runLogData,
}: {
  showRaw: boolean;
  runLogData?: RunLog;
}) => {
  return (
    <tr className="align-top">
      <td className="align-top w-fit">
        {runLogData?.inputs == null ? (
          <p>None</p>
        ) : (
          <ReactJson
            src={runLogData?.inputs as Record<string, any>}
            name={false}
            displayDataTypes={false}
            displayObjectSize={false}
            enableClipboard={false}
            theme="google"
          />
        )}
      </td>
      <td className="align-top w-fit">
        {showRaw ? (
          <p className="whitespace-break-spaces">{runLogData?.raw_output}</p>
        ) : typeof runLogData?.parsed_outputs == "string" ||
          runLogData?.parsed_outputs == null ? (
          <p>{runLogData?.parsed_outputs?.toString()}</p>
        ) : (
          <ReactJson
            src={runLogData?.parsed_outputs as Record<string, any>}
            name={false}
            displayDataTypes={false}
            displayObjectSize={false}
            enableClipboard={false}
            theme="google"
          />
        )}
      </td>
      <td className="align-top w-fit">
        {runLogData?.function_call == null ? (
          <p>None</p>
        ) : (
          <ReactJson
            src={{
              name: runLogData?.function_call?.name,
              arguments: JSON.parse(runLogData?.function_call?.arguments),
              response: runLogData?.function_call?.response,
            }}
            name={false}
            displayDataTypes={false}
            displayObjectSize={false}
            enableClipboard={false}
            theme="google"
          />
        )}
      </td>
    </tr>
  );
};
