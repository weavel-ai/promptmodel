"use client";

import { useChangeLog } from "@/hooks/useChangelog";
import { useProject } from "@/hooks/useProject";
import {
  ArrowSquareOut,
  CaretLeft,
  Cloud,
  GlobeHemisphereWest,
} from "@phosphor-icons/react";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import ReactJson from "react-json-view";
import { motion } from "framer-motion";
import classNames from "classnames";

export default function Page() {
  const params = useParams();
  const { projectData } = useProject();
  const { changeLogListData } = useChangeLog();

  dayjs.extend(relativeTime);

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
                Created at {projectData?.created_at}
              </p>
              <p className="text-sm text-neutral-content">Total runs: </p>
              {/* TODO */}
            </div>
          </div>
          <div className="w-1/2 h-fit flex flex-col">
            <p className="text-xl font-bold pb-4">Changelog</p>
            {/* TODO */}
            <div className="w-full h-fit max-h-[50vh] overflow-auto">
              <div className="w-full h-full flex flex-col gap-y-2">
                {changeLogListData?.length == 0 && (
                  <p className="text-muted-content">Changelog is empty.</p>
                )}
                {changeLogListData?.map((changeLog) => {
                  return (
                    <div
                      key={changeLog.previous_version}
                      className="flex flex-row bg-base-200 w-full p-1 px-4 rounded place-content-between"
                    >
                      <div className="place-self-start text-base-content flex flex-col">
                        {/* {changeLog.logs.action} : {changeLog.logs.object} }
                      <ReactJson
                        src={changeLog.logs}
                        name={false}
                        displayDataTypes={false}
                        displayObjectSize={false}
                        enableClipboard={false}
                theme="harmonic"
                />*/}
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
    <motion.div
      className="bg-base-100 flex flex-row gap-x-2"
      animate={{ height: isOpen ? "auto" : "fit" }}
    >
      <div className="flex flex-col gap-y-2">
        {changeLog.logs?.map((log) => {
          return (
            <div className="flex flex-col px-2 py-1 rounded gap-y-2">
              <div className="flex flex-row gap-x-32">
                <p className="text-sm">Action: {log.action}</p>
                <p className="text-sm">Subject: {log.subject}</p>
              </div>
              {isOpen && (
                <div className="flex flex-row text-sm">
                  <div>Identifier: </div>
                  {
                    <div className="flex flex-col">
                      {log.identifiers?.map((identifier, index) => {
                        return (
                          <div key={index} className="indent-4 text-gray-500">
                            {index + 1}. {identifier}
                          </div>
                        );
                      })}
                    </div>
                  }
                </div>
              )}
            </div>
          );
        })}
      </div>
      <button
        className="self-start p-1"
        onClick={() => {
          setIsOpen(!isOpen);
        }}
      >
        <CaretLeft
          className={classNames(
            "text-base-content transition-transform",
            isOpen && "transform -rotate-90"
          )}
        />
      </button>
    </motion.div>
  );
};
