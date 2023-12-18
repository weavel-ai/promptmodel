import { useFunctionModelSampleInputs } from "@/hooks/useFunctionModelSampleInputs";
import { Modal } from "./Modal";
import { ArrowSquareIn, X } from "@phosphor-icons/react";
import classNames from "classnames";
import { SampleInput } from "@/types/SampleInput";
import ReactJson from "react-json-view";
import { Badge } from "../ui/badge";
import { useMemo, useState } from "react";
import { arePrimitiveListsEqual } from "@/utils";

interface SelectSampleInputsModalProps {
  isOpen: boolean;
  inputKeys: Array<string>;
  setIsOpen: (isOpen: boolean) => void;
  onSelect: (sampleInput: SampleInput) => void;
}

export function SelectSampleInputsModal({
  isOpen,
  inputKeys,
  setIsOpen,
  onSelect,
}: SelectSampleInputsModalProps) {
  const { functionModelSampleInputListData } = useFunctionModelSampleInputs();
  // const { sampleInputListData } = useSamples();

  const filteredSampleInputListData = useMemo(() => {
    if (!functionModelSampleInputListData || !inputKeys) return undefined;
    return functionModelSampleInputListData?.filter((sampleInput) => {
      return arePrimitiveListsEqual(sampleInput.input_keys, inputKeys);
    });
  }, [functionModelSampleInputListData, inputKeys]);

  return (
    <Modal isOpen={isOpen} setIsOpen={setIsOpen}>
      <div className="bg-popover/80 backdrop-blur-sm p-6 rounded-box flex flex-col gap-y-2 w-[90vw] h-[90vh]">
        <div className="flex flex-row justify-between items-center">
          <p className="text-xl font-semibold">Import sample inputs</p>
          <button
            className="p-2 rounded-full hover:bg-base-content/20 transition-colors"
            onClick={() => setIsOpen(false)}
          >
            <X size={24} />
          </button>
        </div>
        <div className="overflow-auto">
          <table className="w-full table table-pin-cols">
            <thead className="sticky top-0 z-10 bg-base-100 w-full">
              <tr className="text-base-content">
                <th className="w-min whitespace-nowrap">
                  <p className="text-lg font-medium ps-1">Input keys</p>
                </th>
                <th className="w-full">
                  <p className="text-lg font-medium ps-1">Inputs</p>
                </th>
              </tr>
            </thead>
            <tbody className="bg-base-100">
              {filteredSampleInputListData?.map((inputData, idx) => (
                <SampleInputRow
                  key={idx}
                  sampleInputData={inputData}
                  onSelect={(sampleInput) => {
                    onSelect(sampleInput);
                    setIsOpen(false);
                  }}
                />
              ))}
            </tbody>
          </table>
          {filteredSampleInputListData?.length === 0 && (
            <p className="text-center text-muted-content my-8">
              No sample inputs matching the current input keys were found.
            </p>
          )}
        </div>
      </div>
    </Modal>
  );
}

function SampleInputRow({
  sampleInputData,
  onSelect,
}: {
  sampleInputData: SampleInput;
  onSelect: (sampleInput: SampleInput) => void;
}) {
  const [isCollapsed, setIsCollapsed] = useState(true);

  return (
    <tr
      className="align-top hover:bg-base-content/10 rounded-md transition-colors"
      onClick={() => setIsCollapsed(!isCollapsed)}
    >
      <td className="align-top whitespace-nowrap w-min">
        <div className="flex flex-wrap gap-1 w-fit">
          {sampleInputData?.input_keys?.map((key, idx) => (
            <Badge key={idx} variant="secondary">
              {key}
            </Badge>
          ))}
        </div>
      </td>
      <td className="align-top w-full">
        <div className="flex flex-row justify-between items-start gap-x-2">
          <ReactJson
            collapsed={isCollapsed}
            src={sampleInputData?.content}
            name={false}
            displayDataTypes={false}
            displayObjectSize={false}
            enableClipboard={false}
            theme="harmonic"
          />
          <button
            className={classNames(
              "flex flex-row gap-x-2 items-center btn btn-outline btn-sm normal-case font-normal"
            )}
            onClick={(e) => {
              e.stopPropagation();
              onSelect(sampleInputData);
            }}
          >
            <p>Import</p>
            <ArrowSquareIn size={20} weight="fill" />
          </button>
        </div>
      </td>
    </tr>
  );
}
