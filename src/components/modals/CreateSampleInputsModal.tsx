"use client";

import { useEffect, useState } from "react";
import { InputField } from "../InputField";
import { Modal } from "./Modal";
import classNames from "classnames";
import { ArrowFatUp, KeyReturn } from "@phosphor-icons/react";
import { toast } from "react-toastify";
import { createSampleInput } from "@/apis/devCloud";
import { useSupabaseClient } from "@/apis/base";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Editor } from "@monaco-editor/react";
import { registerCustomTheme } from "@/lib/promptLanguage";
import { IKeyboardEvent, editor } from "monaco-editor";

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
  const { createSupabaseClient } = useSupabaseClient();
  const params = useParams();
  const [name, setName] = useState("");
  const [content, setContent] = useState("");
  const [isContentValid, setIsContentValid] = useState(false);

  const [createDisabled, setCreateDisabled] = useState(true);

  useEffect(() => {
    setName("");
    setContent("");
    setCreateDisabled(true);
  }, [isOpen]);

  async function handleCreateSampleInput() {
    const toastId = toast.loading("Creating...");
    const resData = await createSampleInput(
      await createSupabaseClient(),
      params.projectUuid as string,
      name,
      content
    );
    toast.update(toastId, {
      render: `Created ${name}!`,
      type: "success",
      isLoading: false,
      autoClose: 2000,
    });
    onCreated?.(name);
    setIsOpen(false);
  }

  useEffect(() => {
    if (isContentValid) {
      try {
        const parsedContent = JSON.parse(content);
        if (Object.keys(parsedContent).length === 0) {
          setIsContentValid(false);
        }
      } catch (e) {
        setIsContentValid(false);
      }
    }
  }, [isContentValid]);

  useEffect(() => {
    if (name && isContentValid) {
      setCreateDisabled(false);
    } else {
      setCreateDisabled(true);
    }
  }, [name, isContentValid]);

  function handleValidate(markers: editor.IMarkerData[]) {
    if (markers.length === 0) {
      setIsContentValid(true);
    }
    return markers;
  }

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} setIsOpen={setIsOpen} zIndex={999999}>
      <div className="bg-popover shadow-lg p-6 rounded-box flex flex-col gap-y-2 justify-start items-start min-w-[360px] max-h-[80vh]">
        <p className="text-popover-content font-bold text-2xl mb-2">
          Add sample inputs
        </p>
        <p className="text-muted-content text-sm mb-1">
          Sample inputs will be used to test your PromptModel.
          <br />
          These inputs will be shared throughout the current project's cloud
          development branches.
          <br />
          You must write your inputs as a{" "}
          <Link
            className="link link-secondary"
            target="_blank"
            href="https://en.wikipedia.org/wiki/JSON"
          >
            JSON object.
          </Link>
        </p>
        <div className="flex flex-row w-full gap-x-8 justify-between items-end">
          <InputField
            value={name}
            setValue={setName}
            label="Sample name"
            type="text"
            autoComplete="off"
            className="my-1"
          />
          <div
            className="flex flex-row items-center gap-x-2 tooltip tooltip-left tooltip-info h-fit"
            data-tip="Type Shift + Enter to insert a newline"
          >
            <kbd className="kbd">
              <ArrowFatUp size={16} />
            </kbd>
            <kbd className="kbd">
              <KeyReturn size={20} />
            </kbd>
          </div>
        </div>
        <Editor
          language="json"
          className="my-2"
          value={content}
          onChange={(value) => {
            setContent(value);
          }}
          theme="promptmodelTheme"
          beforeMount={registerCustomTheme}
          height={300}
          width="100%"
          loading={<div className="loading loading-xs loading-dots" />}
          options={{
            scrollBeyondLastLine: false,
            wordWrap: "on",
            scrollbar: {
              alwaysConsumeMouseWheel: false,
            },
            minimap: {
              enabled: false,
            },
          }}
          onValidate={handleValidate}
          onMount={handleEditorDidMount}
        />

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
