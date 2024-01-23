"use client";

import { useFunctionModel } from "@/hooks/useFunctionModel";
import { PublicFunctionModel } from "@/types/FunctionModel";
import { BookOpenText, Chats, Graph, Note } from "@phosphor-icons/react";
import { useEffect } from "react";
import dayjs from "dayjs";

import relativeTime from "dayjs/plugin/relativeTime";
import Link from "next/link";

dayjs.extend(relativeTime);

export default function Page() {
  const { publicFunctionModelListData, page, setPage } = useFunctionModel();

  useEffect(() => {
    console.log(publicFunctionModelListData);
  }, [publicFunctionModelListData]);
  return (
    <div className="w-full h-full py-12 flex justify-center items-start">
      <div className="flex flex-col pt-4 items-center gap-y-8 overflow-auto w-full max-w-xl">
        <p className="w-full max-w-2xl text-2xl font-semibold text-left">
          Latest Projects
        </p>
        <div className="w-full items-center flex flex-col gap-y-4 ">
          {publicFunctionModelListData?.map((functionModel) => (
            <ProjectComponent
              key={functionModel.id}
              functionModel={functionModel}
            />
          ))}
        </div>
        <div className="join mb-12">
          <button
            className="join-item btn"
            onClick={() => {
              setPage(page - 1);
            }}
            disabled={page == 1}
          >
            «
          </button>
          <button className="join-item btn text-base-content">{page}</button>
          <button
            className="join-item btn"
            onClick={() => {
              setPage(page + 1);
            }}
            disabled={page >= 3}
          >
            »
          </button>
        </div>
      </div>
    </div>
  );
}

const ProjectComponent = ({
  functionModel,
}: {
  functionModel: PublicFunctionModel;
}) => {
  return (
    <div className="w-full h-full flex flex-col">
      <div className="w-full bg-base-200/70 flex flex-col px-6 pt-4 rounded-t">
        <div className="flex flex-row">
          <BookOpenText size={24} className="mr-3" />
          <div className="flex flex-row items-center truncate">
            <Link
              href={`/org/${functionModel.organization["slug"]}`}
              className="font-light link link-hover flex-shrink-0"
            >
              {functionModel.organization["name"]}
            </Link>
            <span className="mx-2 text-xl">/</span>
            <Link
              href={`/org/${functionModel.organization["slug"]}/projects/${functionModel.project_uuid}`}
              className="font-light link link-hover flex-shrink-0"
            >
              {functionModel.project_name}
            </Link>
            <span className="mx-2 text-xl">/</span>
            <Link
              href={`/org/${functionModel.organization["slug"]}/projects/${functionModel.project_uuid}/models/function_models/${functionModel.uuid}`}
              className="link link-hover flex-shrink-0"
            >
              {functionModel.name}
            </Link>
          </div>
        </div>
        <div className="flex flex-row gap-x-2 mt-4">
          <p className="bg-base-300 p-2 rounded-t text-sm flex flex-row items-center">
            <Note size={16} className="mr-1" />
            Project Description
          </p>
          <Link
            href={`/org/${functionModel.organization["slug"]}/projects/${functionModel.project_uuid}/models/function_models/${functionModel.uuid}/`}
            className="p-2 text-sm flex flex-row items-center opacity-80 hover:opacity-100 transition-opacity"
          >
            <Graph size={16} className="mr-1" />
            Versions
          </Link>
          <div
            // href={`/org/${functionModel.organization["slug"]}/projects/${functionModel.project_uuid}/models`}
            className="p-2 text-sm flex flex-row items-center hover:cursor-not-allowed opacity-80 "
          >
            <Chats size={16} className="mr-1" />
            Comments
          </div>
        </div>
      </div>
      <div className="w-full bg-base-300 rounded-b pt-2 pb-3 flex flex-col">
        <p className="text-base-content/80 text-sm px-6 py-2">
          {functionModel.project_description
            ? functionModel.project_description
            : "No description"}
        </p>
        <div className="divider my-1 before:bg-base-200/70 after:bg-base-200/70" />
        <p className="text-xs text-muted-content px-6 py-1">
          Created {dayjs(functionModel.created_at).fromNow()}
        </p>
      </div>
    </div>
  );
};
