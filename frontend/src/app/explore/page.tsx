"use client";

import { useFunctionModel } from "@/hooks/useFunctionModel";
import { PublicFunctionModel } from "@/types/FunctionModel";
import { BookOpenText, Chats, Graph, Note } from "@phosphor-icons/react";
import { useEffect } from "react";
import dayjs from "dayjs";

import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(relativeTime);

export default function Page() {
  const { publicFunctionModelListData, page, setPage } = useFunctionModel();

  useEffect(() => {
    console.log(publicFunctionModelListData);
  }, [publicFunctionModelListData]);
  return (
    <div className="w-full h-full py-12">
      <div className="flex flex-col pt-16 items-center gap-y-8 overflow-auto">
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
    <div className="w-full h-full max-w-xl flex flex-col">
      <div className="w-full bg-base-200/70 flex flex-col px-6 pt-4 rounded-t">
        <div className="flex flex-row">
          <BookOpenText size={24} className="mr-3" />
          <div className="flex flex-row items-center">
            <a
              href={`/org/${functionModel.organization["slug"]}`}
              className="text-lg font-light link link-hover"
            >
              {functionModel.organization["name"]}
            </a>
            <p className="mx-2 text-xl">/</p>
            <a
              href={`/org/${functionModel.organization["slug"]}/projects/${functionModel.project_uuid}/pm`}
              className="text-lg font-light link link-hover"
            >
              {functionModel.project_name}
            </a>
            <p className="mx-2 text-xl">/</p>
            <a
              href={`/org/${functionModel.organization["slug"]}/projects/${functionModel.project_uuid}/pm/models`}
              className="text-lg link link-hover"
            >
              {functionModel.name}
            </a>
          </div>
        </div>
        <div className="flex flex-row gap-x-2   mt-4">
          <p className="bg-base-300 px-2 py-1 rounded-t text-sm flex flex-row items-center">
            <Note size={16} className="mr-1" />
            Description
          </p>
          <a
            href={`/org/${functionModel.organization["slug"]}/projects/${functionModel.project_uuid}/pm/models/function_models/${functionModel.uuid}/`}
            className="px-2 py-1 text-sm flex flex-row items-center"
          >
            <Graph size={16} className="mr-1" />
            Versions
          </a>
          <a
            href={`/org/${functionModel.organization["slug"]}/projects/${functionModel.project_uuid}/pm/models`}
            className="px-2 py-1 text-sm flex flex-row items-center hover:cursor-not-allowed"
          >
            <Chats size={16} className="mr-1" />
            Comments
          </a>
        </div>
      </div>
      <div className="w-full bg-base-300 rounded-b pt-2 pb-3 flex flex-col">
        <p className="text-base-content/80 text-sm px-6 mb-1">
          {functionModel.project_description
            ? functionModel.project_description
            : "No description"}
        </p>
        <p className="text-sm text-base-content/70 border-t-2 border-base-200/70 px-6 pt-3">
          Created {dayjs(functionModel.created_at).fromNow()}
        </p>
      </div>
    </div>
  );
};
