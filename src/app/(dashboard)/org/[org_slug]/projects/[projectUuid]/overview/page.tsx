"use client";

import { useChangeLog } from "@/hooks/useChangelog";
import { useDevBranch } from "@/hooks/useDevBranch";
import { useProject } from "@/hooks/useProject";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { useEffect } from "react";

export default function Page() {
  const { projectData } = useProject();
  const { devBranchListData } = useDevBranch();
  const { changeLogListData } = useChangeLog();

  dayjs.extend(relativeTime);

  return (
    <div className="w-full h-full pl-28 pt-20 pb-8">
      {/* Header */}
      <div className="w-full h-full flex flex-row justify-between items-start gap-x-20">
        <div className="w-full h-full flex flex-col gap-y-8 overflow-auto pe-4">
          <div className="w-full h-fit">
            <div className="justify-start items-center pb-4">
              <p className="text-2xl font-bold text-base-content">
                Project Overview
              </p>
            </div>
            <div className="bg-[#2C2F41] rounded-box p-4 w-full h-fit flex flex-col gap-y-2">
              <p className="text-xl font-bold">{projectData?.name}</p>
              <p className="text-sm text-neutral-content">
                V{projectData?.version}
              </p>
              <p className="text-sm text-neutral-content">
                Created at {projectData?.created_at}
              </p>
              <p className="text-sm text-neutral-content">Total runs: </p>
              {/* TODO */}
            </div>
          </div>
          <div className="w-full h-fit flex flex-col">
            <p className="text-xl font-bold pb-4">
              Active Development Environments
            </p>
            {/* TODO */}
            <div className="w-full h-fit">
              <div className="w-full flex flex-col gap-y-2">
                {devBranchListData?.map((branch) => {
                  return (
                    <div
                      key={branch.name}
                      className="w-full flex flex-row gap-x-48"
                    >
                      <div className="bg-[#222334] px-2 py-1 w-2/6 h-fit text-center rounded">
                        {branch.name}
                      </div>
                      <div className="w-full h-fit text-left">
                        <p className="text-sm text-gray-400">
                          Last updated {dayjs(branch.created_at).fromNow()}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          <div className="w-full h-fit flex flex-col">
            <p className="text-xl font-bold pb-4">Changelog</p>
            {/* TODO */}
            <div className="w-full h-full">
              <div className="w-full h-full flex flex-col gap-y-2">
                {changeLogListData?.map((changeLog) => {
                  return (
                    <div
                      key={changeLog.previous_version}
                      className="flex flex-row bg-[#222334] w-full p-1 px-4 rounded place-content-between"
                    >
                      <div className="place-self-start">
                        {changeLog.changelog.action} :{" "}
                        {changeLog.changelog.object}
                      </div>
                      <p className="text-gray-400 text-sm">
                        {dayjs(changeLog.created_at).fromNow()}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
        <div className="w-full h-full flex flex-col gap-y-8">
          <p className="text-xl font-bold">How to use</p>
          {/* TODO */}
          <div className="w-full h-full flex flex-col gap-y-4">
            <div className="w-full flex flex-row gap-x-1">
              1. Install
              <div className="bg-[#222334] rounded w-fit px-2">
                <p className="font-semibold">promptmodel</p>
              </div>
              on your local computer.
            </div>
            <div className="pe-8"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
