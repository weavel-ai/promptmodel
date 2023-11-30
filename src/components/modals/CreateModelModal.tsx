"use client";

import { useEffect, useState } from "react";
import { InputField } from "../InputField";
import { Modal } from "./Modal";
import classNames from "classnames";
import { toast } from "react-toastify";
import { useSupabaseClient } from "@/apis/base";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createPromptModel } from "@/apis/promptModel";
import { createChatModel } from "@/apis/chatModel";

export const CreateModelModal = ({
  isOpen,
  setIsOpen,
  type: modelType,
  onCreated,
}: {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  type: "PromptModel" | "ChatModel";
  onCreated: () => void;
}) => {
  const { createSupabaseClient } = useSupabaseClient();
  const params = useParams();
  const router = useRouter();
  const [name, setName] = useState("");
  const [createDisabled, setCreateDisabled] = useState(true);

  useEffect(() => {
    setName("");
    setCreateDisabled(true);
  }, [isOpen]);

  async function handleCreateModel() {
    // TODO: Add PromptModel / ChatModel types
    const toastId = toast.loading("Creating...");
    let resData;
    if (modelType == "PromptModel") {
      resData = await createPromptModel({
        supabaseClient: await createSupabaseClient(),
        name,
        projectUuid: params.projectUuid as string,
      });
    } else if (modelType == "ChatModel") {
      resData = await createChatModel({
        supabaseClient: await createSupabaseClient(),
        name,
        projectUuid: params.projectUuid as string,
      });
    }
    toast.update(toastId, {
      render: `Created ${name}!`,
      type: "success",
      isLoading: false,
      autoClose: 2000,
    });
    setIsOpen(false);
    onCreated();
    if (modelType == "PromptModel")
      router.push(
        `/org/${params.org_slug}/projects/${params.projectUuid}/models/prompt_models/${resData.uuid}`
      );
    else if (modelType == "ChatModel") {
      router.push(
        `/org/${params.org_slug}/projects/${params.projectUuid}/models/chat_models/${resData.uuid}`
      );
    }
  }

  function validateName(value: string) {
    if (value?.length > 0) {
      if (value.includes(" ")) {
        // No space contained
        setCreateDisabled(true);
        return "Name cannot contain space";
      } else {
        setCreateDisabled(false);
        return;
      }
    } else {
      setCreateDisabled(true);
    }
  }

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} setIsOpen={setIsOpen}>
      <div className="bg-popover shadow-lg p-6 rounded-box flex flex-col gap-y-2 justify-start items-start min-w-[360px] max-w-[80vw]">
        <p className="text-popover-content font-bold text-2xl mb-2">
          Create {modelType}
        </p>
        {modelType == "PromptModel" && (
          <p className="text-muted-content text-sm">
            A <strong>PromptModel</strong> is a blend of system, user, assistant
            prompts, and LLM type, designed to work as a universal semantic
            function.
          </p>
        )}
        {modelType == "ChatModel" && (
          <p className="text-muted-content text-sm">
            A <strong>ChatModel</strong> is a blend of system prompt and LLM
            type, designed to work as a chatbot with a specific purpose and
            personality.
          </p>
        )}
        <Link
          href={`https://www.promptmodel.run/docs/integrations/python-sdk/${
            modelType == "PromptModel" ? "promptmodel" : "chatmodel"
          }`}
          target="_blank"
          className="text-muted-content link link-accent"
        >
          See more {">"}
        </Link>
        <InputField
          value={name}
          setValue={setName}
          label="Name"
          className="my-4"
          validator={validateName}
          type="text"
          autoComplete="off"
        />
        <div className="flex flex-row w-full justify-end">
          <button
            className={classNames(
              "flex flex-row gap-x-2 items-center btn btn-outline btn-sm normal-case font-normal h-10 bg-base-content hover:bg-base-content/80",
              "disabled:bg-neutral-content"
            )}
            onClick={handleCreateModel}
            disabled={createDisabled}
          >
            <p className="text-base-100">Create</p>
          </button>
        </div>
      </div>
    </Modal>
  );
};
