"use client";

import { useMemo, useState } from "react";
import { InputField } from "../InputField";
import { Modal } from "./Modal";
import classNames from "classnames";
import { ArrowSquareOut } from "@phosphor-icons/react";
import { toast } from "react-toastify";
import { createDevBranch } from "@/apis/devCloud";
import { useSupabaseClient } from "@/apis/base";
import { useParams, useRouter } from "next/navigation";

export const CreateDevModal = ({
  isOpen,
  setIsOpen,
}: {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}) => {
  const { createSupabaseClient } = useSupabaseClient();
  const params = useParams();
  const router = useRouter();
  const [devName, setDevName] = useState("");
  const [createDisabled, setCreateDisabled] = useState(true);

  async function handleCreateDevBranch() {
    const toastId = toast.loading("Creating development branch...");
    const devBranchUuid = await createDevBranch({
      supabaseClient: await createSupabaseClient(),
      projectUuid: params?.projectUuid as string,
      name: devName,
    });

    toast.update(toastId, {
      render: "Development branch created!",
      type: "success",
      isLoading: false,
      autoClose: 2000,
    });
    setIsOpen(false);
    window.open(
      `/org/${params?.org_slug}/projects/${params?.projectUuid}/dev/${devBranchUuid}/prompt_models`,
      "_blank"
    );
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
      <div className="bg-popover p-6 rounded-box flex flex-col gap-y-2 justify-start items-start min-w-[360px]">
        <p className="text-popover-content font-bold text-lg">
          Create Development Branch
        </p>
        <form>
          <InputField
            value={devName}
            setValue={setDevName}
            label="Name"
            className="my-4"
            validator={validateName}
            autoComplete="off"
          />
        </form>
        <div className="flex flex-row w-full justify-end">
          <button
            className={classNames(
              "flex flex-row gap-x-2 items-center btn btn-outline btn-sm normal-case font-normal h-10 bg-base-content hover:bg-base-content/80",
              "disabled:bg-neutral-content"
            )}
            onClick={handleCreateDevBranch}
            disabled={createDisabled}
          >
            <p className="text-base-100">Create</p>
            <ArrowSquareOut className="text-base-100" size={20} weight="fill" />
          </button>
        </div>
      </div>
    </Modal>
  );
};
