"use client";

import { useMemo, useState } from "react";
import { InputField } from "../InputField";
import { Modal } from "./Modal";
import classNames from "classnames";
import {
  ArrowSquareOut,
  Cloud,
  GlobeHemisphereWest,
} from "@phosphor-icons/react";
import { toast } from "react-toastify";
import { createDevBranch } from "@/apis/devCloud";
import { useSupabaseClient } from "@/apis/base";
import { useParams, useRouter } from "next/navigation";
import { useDevBranch } from "@/hooks/useDevBranch";
import dayjs from "dayjs";
import Link from "next/link";
import { motion } from "framer-motion";

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
  const { devBranchListData } = useDevBranch();
  const [tab, setTab] = useState(0); // 0: Active Branches, 1: Create New
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
      `/org/${params?.org_slug}/projects/${params?.projectUuid}/dev/${devBranchUuid}`,
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
      <div className="bg-popover p-6 rounded-box flex flex-col gap-y-2 justify-start items-start min-w-[360px] min-h-[200px]">
        {/* <p className="text-popover-content font-bold text-lg">
          Create Development Branch
        </p> */}
        <div className="flex flex-row w-full justify-between items-center">
          <button
            className={classNames(
              "text-lg font-bold transition-colors",
              tab == 0 ? "text-popover-content" : "text-muted-content"
            )}
            onClick={() => setTab(0)}
          >
            Active Development Branches
          </button>
          <div className="divider divider-horizontal before:bg-muted-content after:bg-muted-content" />
          <button
            className={classNames(
              "text-lg font-bold transition-colors",
              tab == 1 ? "text-popover-content" : "text-muted-content"
            )}
            onClick={() => setTab(1)}
          >
            Create New Branch
          </button>
        </div>
        <motion.div
          className="max-h-[40vh] w-full overflow-auto pt-2"
          animate={{
            opacity: tab == 0 ? 1 : 0,
          }}
        >
          <div
            className={classNames(
              "flex flex-col gap-y-2 w-full justify-start items-start",
              tab != 0 && "hidden"
            )}
          >
            {devBranchListData?.map((devBranch) => (
              <Link
                href={`/org/${params?.org_slug}/projects/${params?.projectUuid}/dev/${devBranch.uuid}`}
                className="flex flex-row w-full gap-x-2 items-center justify-start btn btn-sm normal-case font-normal h-10 bg-base-100 hover:bg-base-content/20 text-base-content"
              >
                <p className="px-2 py-1 rounded-full bg-base-300">
                  {devBranch.name}
                </p>
                {devBranch.cloud ? (
                  <Cloud size={20} weight="fill" />
                ) : (
                  <GlobeHemisphereWest size={20} weight="fill" />
                )}
                {devBranch.online || devBranch.cloud ? (
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                ) : (
                  <div className="w-2 h-2 rounded-full bg-neutral-500" />
                )}
                <p className="text-muted-content flex-grow text-end">
                  Created {dayjs(devBranch.created_at).fromNow()}
                </p>
                <ArrowSquareOut size={20} weight="fill" />
              </Link>
            ))}
          </div>
        </motion.div>
        <motion.div
          className="w-full pt-2"
          animate={{
            opacity: tab == 1 ? 1 : 0,
          }}
        >
          <div className={classNames(tab != 1 && "hidden")}>
            <InputField
              value={devName}
              setValue={setDevName}
              label="Name"
              className="mb-4"
              validator={validateName}
              autoComplete="off"
            />
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
                <ArrowSquareOut
                  className="text-base-100"
                  size={20}
                  weight="fill"
                />
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </Modal>
  );
};
