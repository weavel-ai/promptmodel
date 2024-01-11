import { Play, X } from "@phosphor-icons/react";
import { Modal } from "./Modal";
import { useFunctionModelDatasets } from "@/hooks/useFunctionModelDatasets";
import { useState } from "react";
import classNames from "classnames";
import { useFunctionModelVersionDetails } from "@/hooks/useFunctionModelVersionDetails";
import { startFunctionModelVersionBatchRun } from "@/apis/function_model_versions/startBatchRun";
import { useProject } from "@/hooks/useProject";
import { toast } from "react-toastify";

interface CreateBatchRunModalProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  versionUuid: string;
}

export function CreateBatchRunModal({
  isOpen,
  setIsOpen,
  versionUuid,
}: CreateBatchRunModalProps) {
  const { projectUuid } = useProject();
  const { startBatchRunMutation, versionBatchRunListQuery } =
    useFunctionModelVersionDetails(versionUuid);
  const { functionModelDatasetListData } = useFunctionModelDatasets();
  const [selectedDatasetUuid, setSelectedDatasetUuid] = useState(null);

  async function handleClickCreate() {
    startBatchRunMutation.mutateAsync({
      function_model_version_uuid: versionUuid,
      project_uuid: projectUuid,
      dataset_uuid: selectedDatasetUuid,
    });
    setIsOpen(false);
    setTimeout(() => {
      versionBatchRunListQuery.refetch();
    }, 1000);
    toast.success("Batch run started");
  }

  return (
    <Modal isOpen={isOpen} setIsOpen={setIsOpen}>
      <div className="bg-popover/80 backdrop-blur-sm p-6 rounded-box flex flex-col gap-y-2 min-w-[10rem]">
        <div className="flex flex-row justify-between items-center">
          <p className="text-xl font-semibold">Create batch run</p>
          <button
            className="p-2 rounded-full hover:bg-base-content/20 transition-colors"
            onClick={() => setIsOpen(false)}
          >
            <X size={24} />
          </button>
        </div>
        <p className="font-medium text-lg">Select a dataset</p>
        <table className="table">
          <thead className="bg-base-100 top-0 sticky">
            <tr className="text-base-content">
              <th>Name</th>
              <th>Description</th>
              <th>Eval metric</th>
            </tr>
          </thead>
          <tbody>
            {functionModelDatasetListData?.map((dataset) => (
              <tr
                key={dataset.id}
                className={classNames(
                  "transition-colors hover:bg-base-content/10 hover:cursor-pointer",
                  selectedDatasetUuid == dataset.dataset_uuid &&
                    "bg-secondary/30"
                )}
                onClick={() => {
                  if (selectedDatasetUuid == dataset.dataset_uuid) {
                    setSelectedDatasetUuid(null);
                    return;
                  }
                  setSelectedDatasetUuid(dataset.dataset_uuid);
                }}
              >
                <td>{dataset.dataset_name}</td>
                <td>{dataset.dataset_description}</td>
                <td>{dataset.eval_metric_name}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex flex-row justify-end items-center gap-x-2 mt-2">
          <button
            className="btn btn-ghost normal-case"
            onClick={() => setIsOpen(false)}
          >
            Cancel
          </button>
          <button
            className="btn btn-primary normal-case"
            onClick={handleClickCreate}
            disabled={!selectedDatasetUuid}
          >
            {startBatchRunMutation.isLoading ? (
              <div className="loading" />
            ) : (
              <>
                <p>Run</p>
                <Play size={16} weight="fill" />
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}
