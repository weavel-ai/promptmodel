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

interface Input {
  id: string;
  key: string;
  value: string;
}

function handleEditorDidMount(editor: editor.IStandaloneCodeEditor) {
  editor.onKeyDown((e: IKeyboardEvent) => {
    if (e.code === "Enter" && e.shiftKey) {
      e.preventDefault();
      const position = editor.getPosition();
      editor.executeEdits("", [
        {
          range: {
            startLineNumber: position.lineNumber,
            startColumn: position.column,
            endLineNumber: position.lineNumber,
            endColumn: position.column,
          },
          text: "\\n",
          forceMoveMarkers: true,
        },
      ]);
      editor.setPosition({
        lineNumber: position.lineNumber,
        column: position.column + 2,
      });
    }
  });
}

export const CreateSampleInputModal = ({
  isOpen,
  setIsOpen,
  onCreated,
}: {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  onCreated?: (name: string) => void;
}) => {
  const params = useParams();
  const [name, setName] = useState("");
  const [inputs, setInputs] = useState<Array<Input>>([
    {
      id: Math.random().toString(),
      key: "",
      value: "",
    },
  ]);

  useEffect(() => {
    setName("");
    setInputs([
      {
        id: Math.random().toString(),
        key: "",
        value: "",
      },
    ]);
  }, [isOpen]);

  const createDisabled = useMemo(() => {
    return (
      name === "" ||
      inputs.some((input) => input.key === "" || input.value === "")
    );
  }, [name, inputs]);

  async function handleCreateSampleInput() {
    const toastId = toast.loading("Creating...");
    await createSampleInput({
      project_uuid: params.projectUuid as string,
      name: name,
      content: inputs.reduce((acc, input) => {
        acc[input.key] = input.value;
        return acc;
      }, {}),
    });
    toast.update(toastId, {
      containerId: "default",
      render: `Created ${name}!`,
      type: "success",
      isLoading: false,
      autoClose: 2000,
    });
    onCreated?.(name);
    setIsOpen(false);
  }

  return (
    <Modal isOpen={isOpen} setIsOpen={setIsOpen} zIndex={999999}>
      <div className="bg-popover shadow-lg p-6 rounded-box flex flex-col gap-y-2 justify-start items-start min-w-[60vw] max-h-[80vh]">
        <p className="text-popover-content font-bold text-2xl mb-2">
          Add sample inputs
        </p>
        <p className="text-muted-content text-sm mb-1">
          Sample inputs will be used to test your FunctionModel. These inputs
          will be shared throughout this current project.
        </p>
        <InputField
          value={name}
          setValue={setName}
          placeholder="Sample name"
          label="Sample name"
          type="text"
          autoComplete="off"
          className="my-1"
        />
        <div className="w-full max-h-[60vh] overflow-auto">
          <ReactSortable
            list={inputs}
            setList={setInputs}
            className="w-full"
            handle=".drag-handle"
          >
            {inputs.map((input: Input) => (
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
          <p className="text-base-content">Add new input</p>
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

interface KeyValueInputFieldProps {
  input: Input;
  setInput: (input: Input) => void;
  onDelete: () => void;
}

function KeyValueInputField({
  input,
  setInput,
  onDelete,
}: KeyValueInputFieldProps) {
  return (
    <div className="flex flex-row gap-x-2 items-start justify-start w-full py-1">
      <div className="mt-6 p-1 hover:bg-base-content/10 rounded-md cursor-pointer drag-handle">
        <DotsSixVertical className="text-base-content" size={20} />
      </div>
      <InputField
        value={input.key}
        setValue={(key) => setInput({ ...input, key })}
        placeholder="Key"
        label="Key"
        type="text"
        autoComplete="off"
      />
      <InputField
        textarea
        value={input.value}
        setValue={(value) => setInput({ ...input, value })}
        placeholder="Value"
        label="Value"
        type="text"
        autoComplete="off"
        className="w-full"
        inputClassName="leading-snug"
      />
      <button
        className="mt-6 p-1 hover:bg-red-500/20 rounded-md cursor-pointer"
        onClick={onDelete}
      >
        <Trash className="text-red-500" size={20} />
      </button>
    </div>
  );
}
