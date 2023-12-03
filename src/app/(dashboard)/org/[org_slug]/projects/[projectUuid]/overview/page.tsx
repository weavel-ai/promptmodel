"use client";

import { useChangeLog } from "@/hooks/useChangelog";
import { useProject } from "@/hooks/useProject";
import { CaretLeft } from "@phosphor-icons/react";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { useParams } from "next/navigation";
import { useState } from "react";
import { motion } from "framer-motion";
import classNames from "classnames";
import { useRunLogCount } from "@/hooks/useRunLogCount";
import { useChatLogCount } from "@/hooks/useChatLogCount";
dayjs.extend(relativeTime);

export default function Page() {
  const params = useParams();
  const { projectData } = useProject();
  const { changeLogListData } = useChangeLog();
  const { runLogCountData } = useRunLogCount();
  const { chatLogCountData } = useChatLogCount();

  return (
    <div className="w-full h-full pl-28 pt-20 pb-8">
      {/* Header */}
      <div className="w-full h-full flex flex-col gap-y-8 overflow-auto pe-4">
        <div className="w-full flex flex-row gap-x-6">
          <div className="w-1/2 h-fit">
            <div className="justify-start items-center pb-4">
              <p className="text-2xl font-bold text-base-content">
                Project Overview
              </p>
            </div>
            <div className="bg-base-200 rounded-box p-4 w-full h-fit flex flex-col gap-y-2">
              <p className="text-xl font-bold">{projectData?.name}</p>
              <p className="text-sm text-neutral-content">
                V{projectData?.version}
              </p>
              <p className="text-sm text-neutral-content">
                Created at {dayjs(projectData?.created_at).format("YYYY-MM-DD")}
              </p>
              <p className="text-sm text-neutral-content">
                Total runs:{" "}
                <b>
                  {runLogCountData?.run_logs_count +
                    chatLogCountData?.chat_logs_count}
                </b>
              </p>
              {/* TODO */}
            </div>
          </div>
          <div className="w-1/2 h-fit flex flex-col">
            <p className="text-xl font-bold pb-4">Changelog</p>
            {/* TODO */}
            <div className="w-full h-fit max-h-[20vh] overflow-auto">
              <div className="w-full h-full flex flex-col gap-y-2">
                {changeLogListData?.length == 0 && (
                  <p className="text-muted-content">Changelog is empty.</p>
                )}
                {changeLogListData?.map((changeLog, idx) => {
                  return (
                    <div
                      key={idx}
                      className="flex flex-row bg-base-200 w-full p-1 px-4 rounded place-content-between"
                    >
                      <div className="place-self-start text-base-content flex flex-col">
                        <div className="flex flex-col gap-y-2">
                          <ChangeLogComponent changeLog={changeLog} />
                        </div>
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
        <div className="w-full h-fit flex flex-col"></div>
      </div>
    </div>
  );
}

const ChangeLogComponent = ({ changeLog }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="flex flex-col gap-y-2">
      {changeLog.logs?.map((log, idx) => {
        return (
          <div key={idx} className="flex flex-col px-2 py-1 rounded gap-y-2">
            <div className="flex flex-row justify-start gap-x-6">
              <p className="text-sm font-semibold">{log.action}</p>
              <p className="text-sm">{log.subject}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
};
