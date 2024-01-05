import { RunLog } from "@/types/RunLog";
import { useRunLogs } from "@/hooks/useRunLog";
import { useFunctionModelVersionStore } from "@/stores/functionModelVersionStore";
import { ArrowSquareIn, CornersOut, Play } from "@phosphor-icons/react";
import classNames from "classnames";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ModalPortal } from "./ModalPortal";
import ReactJson from "react-json-view";
import { cva } from "class-variance-authority";
import { SelectTab } from "./SelectTab";
import { useFunctionModelVersion } from "@/hooks/useFunctionModelVersion";
import { KeyValueInput, KeyValueInputField } from "./inputs/KeyValueInputField";
import { toast } from "react-toastify";
import { Badge } from "./ui/badge";
import { SelectSampleInputsModal } from "./modals/SelectSampleInputsModal";
import { arePrimitiveListsEqual } from "@/utils";
import { createSampleInput } from "@/apis/sample_inputs";
import { useProject } from "@/hooks/useProject";
import { set } from "date-fns";

const modalVariants = cva(
  "fixed z-[999999] bg-base-200/70 backdrop-blur-md p-4 flex justify-center items-center",
  {
    variants: {
      animateFrom: {
        bottomRight: "bottom-0 right-0",
        bottomLeft: "bottom-0 left-0",
        topRight: "top-0 right-0",
        topLeft: "top-0 left-0",
      },
    },
    defaultVariants: {
      animateFrom: "bottomRight",
    },
  }
);

enum Tab {
  Test = "Test",
  RunLogs = "Run Logs",
}

const TABS = [Tab.Test, Tab.RunLogs];

export function RunLogUI({
  versionUuid,
  isNewOrCachedVersion,
  isInitialVersion = false,
  animateFrom,
  className,
}: {
  versionUuid: string | null;
  isNewOrCachedVersion: boolean;
  isInitialVersion?: boolean;
  animateFrom?: "bottomRight" | "bottomLeft" | "topRight" | "topLeft";
  className?: string;
}) {
  const { projectUuid } = useProject();
  const { handleRun, functionModelUuid } = useFunctionModelVersion();
  const { runLogData } = useRunLogs(versionUuid);
  const { originalPromptListData, isEqualToOriginal } =
    useFunctionModelVersion();
  const {
    modifiedPrompts,
    runTasksCount,
    runLogs,
    fullScreenRunVersionUuid,
    setFullScreenRunVersionUuid,
  } = useFunctionModelVersionStore();
  const [runLogList, setRunLogList] = useState<RunLog[]>([]);
  const [selectedTab, setSelectedTab] = useState(Tab.Test);
  const [inputs, setInputs] = useState<Array<KeyValueInput>>([]);
  const [inputsCache, setInputsCache] = useState<Array<KeyValueInput>>([]);
  const [sampleInputUUIDCache, setSampleInputUUIDCache] = useState<string>(null);
  const prompts = useMemo(
    () => (isNewOrCachedVersion ? modifiedPrompts : originalPromptListData),
    [isNewOrCachedVersion, modifiedPrompts, originalPromptListData]
  );

  const inputKeys: Array<string> = useMemo(() => {
    if (prompts == null || prompts.length == 0) {
      return [];
    }
    // For each prompt.content, extract the string between {} and add it to the inputKeys array
    const extractedInputKeys: Array<string> = [];
    prompts.forEach((prompt) => {
      const inputKey = prompt.content.match(/\{(.*?)\}/g);
      if (inputKey != null) {
        inputKey.forEach((key) => {
          const newInputKey = key.slice(1, -1);
          if (extractedInputKeys.includes(newInputKey)) return;
          extractedInputKeys.push(newInputKey);
        });
      }
    });
    return extractedInputKeys;
  }, [prompts]);

  useEffect(() => {
    if (inputKeys.length == 0 || !inputs) return;
    if (arePrimitiveListsEqual(inputKeys, Object.keys(inputs))) return;
    const newInputs = inputKeys.map((key) => {
      if (inputs.some((input) => input?.key == key)) {
        return inputs.find((input) => input?.key == key);
      }
      return {
        id: Math.random().toString(),
        key: key,
        value: "",
      };
    });
    setInputs(newInputs);
    // Do not add inputs as a dependency, otherwise it will cause infinite loop
  }, [inputKeys]); // eslint-disable-line react-hooks/exhaustive-deps

  const isRunDisabled = useMemo(() => {
    if (isNewOrCachedVersion) {
      if (isInitialVersion) {
        if (
          !(modifiedPrompts?.length > 0) ||
          modifiedPrompts?.every?.((prompt) => prompt.content === "")
        )
          return true;
      } else {
        if (isEqualToOriginal) return true;
      }
    }
    if (inputKeys.length == 0) {
      return false;
    }
    return inputs.some((input) => input.value.trim().length == 0);
  }, [
    inputs,
    inputKeys,
    isNewOrCachedVersion,
    isEqualToOriginal,
    isInitialVersion,
    modifiedPrompts,
  ]);

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
        ...runLogData.map((log: RunLog) => {
          let parsedInputs: Record<string, any>,
            parsedOutputs: Record<string, any>;
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

  async function handleClickRun() {
    const inputsObject: Record<string, string> = inputs.reduce(
      (acc, { key, value }) => {
        acc[key] = value;
        return acc;
      },
      {}
    );
    let newSample: boolean = true;
    if (!!inputsCache && inputsCache.length > 0) {
      newSample = false;
      for (const inputKey in inputsObject) {
        if (
          inputsObject[inputKey] !=
          inputsCache.find((input) => input.key == inputKey)?.value
        ) {
          newSample = true;
          break;
        }
      }
    }
    if (newSample) {
      setInputsCache(inputs);
      const res = await createSampleInput({
        project_uuid: projectUuid,
        function_model_uuid: functionModelUuid,
        input_keys: Object.keys(inputsObject),
        content: inputsObject,
      });
      setSampleInputUUIDCache(res.uuid);
    }

    handleRun(isNewOrCachedVersion, inputsObject, sampleInputUUIDCache);
  }

  const mainUI = (
    <div className="w-full h-full flex flex-col gap-y-2 p-4 overflow-hidden">
      <div className="w-full flex flex-row justify-between items-center">
        <SelectTab
          tabs={TABS}
          selectedTab={selectedTab}
          onSelect={(tab: string) => setSelectedTab(tab as Tab)}
          variant="underline"
          selectorZIndex={0}
        />
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
      {selectedTab == Tab.Test && (
        <div className="h-full pb-6">
          <TestUI
            inputKeys={inputKeys}
            inputs={inputs}
            setInputs={setInputs}
            setInputsCache={setInputsCache}
            setSampleInputUUIDCache={setSampleInputUUIDCache}
            handleClickRun={handleClickRun}
            isRunDisabled={isRunDisabled}
          />
        </div>
      )}
      {selectedTab == Tab.RunLogs && <RunLogTable runLogList={runLogList} />}
    </div>
  );

  if (fullScreenRunVersionUuid != versionUuid || versionUuid == null) {
    return (
      <div
        className={classNames(
          "w-full h-full rounded-box bg-base-200",
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
          className={classNames(modalVariants({ animateFrom: animateFrom }))}
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

function TestUI({
  inputKeys,
  inputs,
  setInputs,
  setInputsCache,
  setSampleInputUUIDCache,
  handleClickRun,
  isRunDisabled,
}: {
  inputKeys: Array<string>;
  inputs: Array<KeyValueInput>;
  setInputs: (inputs: Array<KeyValueInput>) => void;
  setInputsCache: (inputs: Array<KeyValueInput>) => void;
  setSampleInputUUIDCache: (uuid: string) => void;
  handleClickRun: () => void;
  isRunDisabled: boolean;
}) {
  const [isSelectSampleInputsModalOpen, setIsSelectSampleInputsModalOpen] =
    useState(false);

  return (
    <div className="flex flex-col gap-y-3 h-full">
      <div className="flex flex-row justify-between w-full">
        <div className="w-auto flex flex-col items-start justify-start">
          <label className="label text-xs font-medium">
            <span className="label-text">Input keys</span>
          </label>
          <div className="w-fit flex flex-wrap items-start gap-x-1 gap-y-2">
            {inputKeys?.map((key) => (
              <Badge key={key} className="text-sm" variant="secondary">
                {key}
              </Badge>
            ))}
          </div>
        </div>
        <div className="flex flex-row justify-end items-center flex-shrink gap-x-3">
          <button
            className={classNames(
              "flex flex-row gap-x-2 items-center btn btn-outline btn-sm normal-case font-normal h-10 bg-transparent hover:bg-base-content/10",
              "!border-base-content/80 !text-base-content/80"
            )}
            onClick={() => setIsSelectSampleInputsModalOpen(true)}
          >
            <p>Import inputs</p>
            <ArrowSquareIn size={20} weight="fill" />
          </button>
          <button
            className={classNames(
              "flex flex-row gap-x-2 items-center btn btn-outline btn-sm normal-case font-normal h-10 bg-base-content hover:bg-base-content/80",
              "text-base-100 disabled:bg-muted disabled:text-muted-content disabled:border-muted-content"
            )}
            onClick={handleClickRun}
            disabled={isRunDisabled}
          >
            <p>Run</p>
            <Play size={20} weight="fill" />
          </button>
        </div>
      </div>
      <div className="w-full h-full overflow-y-auto">
        <div className="flex flex-col gap-y-2 h-full">
          {inputKeys?.map((key) => (
            <KeyValueInputField
              key={key}
              isKeyEditable={false}
              input={inputs?.find((input) => input && input?.key == key)}
              setInput={(input) => {
                setInputs(
                  inputs?.map((i) => (i?.key === input?.key ? input : i))
                );
              }}
              onDelete={() => {
                toast.error("This input is required");
              }}
            />
          ))}
        </div>
      </div>
      <SelectSampleInputsModal
        isOpen={isSelectSampleInputsModalOpen}
        inputKeys={inputKeys}
        setIsOpen={setIsSelectSampleInputsModalOpen}
        onSelect={(sampleInput) => {
          const newInputs = Object.keys(sampleInput.content).map((inputKey) => {
            return {
              id: Math.random().toString(),
              key: inputKey,
              value: sampleInput.content[inputKey],
            };
          });
          setInputsCache(newInputs);
          setSampleInputUUIDCache(sampleInput.uuid);
          setInputs(newInputs);
        }}
      />
    </div>
  );
}

const RunLogTable = ({ runLogList }) => {
  const [showRaw, setShowRaw] = useState(false);

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
            <RunLogRow key={idx} showRaw={showRaw} runLogData={log} />
          ))}
        </tbody>
      </table>
    </div>
  );
};

const RunLogRow = ({
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
            theme="harmonic"
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
            theme="harmonic"
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
            theme="harmonic"
          />
        )}
      </td>
    </tr>
  );
};
