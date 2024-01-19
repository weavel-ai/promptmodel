"use client";

import { useEffect, useMemo, useState } from "react";
import { InputField } from "../InputField";
import { Modal } from "./Modal";
import classNames from "classnames";
import {
  ArrowFatUp,
  DotsSixVertical,
  KeyReturn,
  Plus,
  Trash,
} from "@phosphor-icons/react";
import { toast } from "react-toastify";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Editor } from "@monaco-editor/react";
import { registerCustomTheme } from "@/lib/promptLanguage";
import { IKeyboardEvent, editor } from "monaco-editor";
import { createSampleInput } from "@/apis/sample_inputs";
import { ReactSortable } from "react-sortablejs";
import {
  KeyValueInput,
  KeyValueInputField,
} from "../inputs/KeyValueInputField";
import { useDatasetSampleInputs } from "@/hooks/useDatasetSampleInputs";

export const AddSampleInputModal = ({
  isOpen,
  setIsOpen,
  onCreated,
}: {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  onCreated?: (name: string) => void; // deprecated
}) => {
  const params = useParams();
  const { postDatasetSampleInputsMutation } = useDatasetSampleInputs();
  const [inputs, setInputs] = useState<Array<KeyValueInput>>([
    {
      id: Math.random().toString(),
      key: "",
      value: "",
    },
  ]);

  useEffect(() => {
    setInputs([
      {
        id: Math.random().toString(),
        key: "",
        value: "",
      },
    ]);
  }, [isOpen]);

  const createDisabled = useMemo(() => {
    return inputs.some((input) => input.key === "" || input.value === "");
  }, [inputs]);

  async function handleCreateSampleInput() {
    await postDatasetSampleInputsMutation.mutateAsync({
      body: [
        {
          input_keys: inputs.map((input) => input.key),
          content: inputs.reduce((acc, curr) => {
            acc[curr.key] = curr.value;
            return acc;
          }, {}),
        },
      ],
    });
    setIsOpen(false);
  }

  return (
    <Modal isOpen={isOpen} setIsOpen={setIsOpen} zIndex={999999}>
      <div className="bg-popover shadow-lg p-6 rounded-box flex flex-col gap-y-2 justify-start items-start min-w-[60vw] max-h-[80vh]">
        <p className="text-popover-content font-bold text-2xl mb-2">Add data</p>
        <p className="text-muted-content mb-1">
          Add sample input data to your dataset.
        </p>
        <div className="w-full max-h-[60vh] overflow-auto">
          <ReactSortable
            list={inputs}
            setList={setInputs}
            className="w-full"
            handle=".drag-handle"
          >
            {inputs.map((input: KeyValueInput) => (
              <KeyValueInputField
                key={input.id}
                input={input}
                setInput={(input) => {
                  setInputs(inputs.map((i) => (i.id === input.id ? input : i)));
                }}
                onDelete={() => {
                  setInputs(inputs.filter((i) => i.id !== input.id));
                }}
              />
            ))}
          </ReactSortable>
        </div>
        <button
          className={classNames(
            "flex flex-row gap-x-2 items-center backdrop-blur-sm",
            "btn btn-sm normal-case font-normal h-10 hover:bg-neutral-content/20"
          )}
          onClick={() =>
            setInputs([
              ...inputs,
              {
                id: Math.random().toString(),
                key: "",
                value: "",
              },
            ])
          }
        >
          <Plus className="text-base-content" size={20} weight="bold" />
          <p className="text-base-content">Add new key</p>
        </button>
        <div className="flex flex-row w-full justify-end">
          <button
            className={classNames(
              "flex flex-row gap-x-2 items-center btn btn-outline btn-sm normal-case font-normal h-10 bg-base-content hover:bg-base-content/80",
              "disabled:bg-neutral-content"
            )}
            onClick={handleCreateSampleInput}
            disabled={createDisabled}
          >
            <p className="text-base-100">Create</p>
          </button>
        </div>
      </div>
    </Modal>
  );
};
