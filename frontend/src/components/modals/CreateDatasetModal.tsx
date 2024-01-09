"use client";

import { useState } from "react";
import { InputField } from "../InputField";
import { Modal } from "./Modal";
import classNames from "classnames";
import { useFunctionModelDatasets } from "@/hooks/useFunctionModelDatasets";
import { useParams, usePathname, useRouter } from "next/navigation";
import { toast } from "react-toastify";

interface CreateDatasetModalProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

export function CreateDatasetModal({
  isOpen,
  setIsOpen,
}: CreateDatasetModalProps) {
  const params = useParams();
  const pathname = usePathname();
  const router = useRouter();
  const { createDatasetMutation } = useFunctionModelDatasets();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  async function handleCreateDataset() {
    const dataset = await createDatasetMutation.mutateAsync({
      project_uuid: params?.projectUuid as string,
      function_model_uuid: params?.functionModelUuid as string,
      name: name,
      description: description,
    });
    setIsOpen(false);
    toast.success("Dataset created!");
    router.push(`${pathname}/datasets/${dataset.uuid}`);
  }

  return (
    <Modal isOpen={isOpen} setIsOpen={setIsOpen}>
      <div className="bg-popover shadow-lg p-6 rounded-box flex flex-col gap-y-2 justify-start items-start min-w-[60vw] max-h-[80vh]">
        <p className="text-popover-content font-bold text-2xl mb-2">
          Create Dataset
        </p>
        <p className="text-muted-content text mb-1">
          A dataset will be used to group your sample inputs. Your datasets will
          be shared throughout this current project.
        </p>
        <InputField
          value={name}
          setValue={setName}
          placeholder="Dataset name"
          label="Name"
          type="text"
          autoComplete="off"
          className="my-1"
        />
        <InputField
          textarea
          value={description}
          setValue={setDescription}
          placeholder="Description"
          label="Description"
          type="text"
          autoComplete="off"
          className="my-1 w-full"
        />
        <div className="flex flex-row w-full justify-end mt-2">
          <button
            className={classNames(
              "flex flex-row gap-x-2 items-center btn btn-outline btn-sm normal-case font-normal h-10 bg-base-content hover:bg-base-content/80",
              "disabled:bg-neutral-content"
            )}
            onClick={handleCreateDataset}
            disabled={!(name?.length > 0)}
          >
            <p className="text-base-100">Create</p>
          </button>
        </div>
      </div>
    </Modal>
  );
}
