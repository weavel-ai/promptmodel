"use client";

import { useSupabaseClient } from "@/apis/base";
import { createProject } from "@/apis/project";
import { InputField } from "@/components/InputField";
import { useOrgData } from "@/hooks/useOrgData";
import { useProject } from "@/hooks/useProject";
import { X } from "@phosphor-icons/react";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "react-toastify";
import ReactFlow, { Background, BackgroundVariant } from "reactflow";

export default function Page() {
  const { createSupabaseClient } = useSupabaseClient();
  const router = useRouter();
  const pathname = usePathname();
  const { orgId } = useOrgData();
  const { refetchProjectListData } = useProject();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  async function handleClickCreate() {
    if (loading) return;
    setLoading(true);
    const toastId = toast.loading("Creating project...");
    const data = await createProject(orgId, name, description);
    if (!data) {
      toast.update(toastId, {
        containerId: "default",
        render: "Failed to create project.",
        type: "error",
        isLoading: false,
        autoClose: 2000,
      });
      setLoading(false);
      return;
    }
    await refetchProjectListData();
    router.push(`${pathname.split("/").slice(0, -1).join("/")}/${data.uuid}`);
    setLoading(false);
    toast.update(toastId, {
      containerId: "default",
      render: "Project created successfully!",
      type: "success",
      isLoading: false,
      autoClose: 2000,
    });
  }

  return (
    <ReactFlow>
      <div className="w-full h-full flex justify-center items-center">
        <Background variant={BackgroundVariant.Dots} gap={24} size={1} />
        <div className="z-50 bg-popover/5 shadow-2xl backdrop-blur-sm rounded-box w-fit min-w-[30rem] h-fit px-8 py-12 flex flex-col justify-between gap-y-7">
          <p className="text-3xl font-bold text-base-content mb-3">
            New Project
          </p>
          <InputField
            className="w-full"
            value={name}
            setValue={setName}
            label="Project Name"
          />
          <InputField
            className="w-full"
            inputClassName="textarea-lg w-full text-base"
            textarea
            value={description}
            setValue={setDescription}
            label="Description"
          />
          <button
            className="btn btn-sm h-10 btn-primary px-6 w-fit mt-3 self-end text-base-content"
            disabled={!name}
            onClick={handleClickCreate}
          >
            {loading ? (
              <div className="loading loading-spinner" />
            ) : (
              <p>Create Project</p>
            )}
          </button>
        </div>
      </div>
    </ReactFlow>
  );
}
