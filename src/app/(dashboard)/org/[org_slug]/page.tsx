"use client";

import { Project } from "@/apis/project";
import { LocalConnectionStatus } from "@/components/LocalConnectionStatus";
import { useProject } from "@/hooks/useProject";
import { GearSix, Plus } from "@phosphor-icons/react";
import classNames from "classnames";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Page() {
  const pathname = usePathname();
  const router = useRouter();
  const { projectListData } = useProject();

  useEffect(() => {
    if (!projectListData) return;
    if (projectListData.length === 0) {
      router.push(`${pathname}/projects/new`);
    }
  }, [projectListData]);

  return (
    <div className="w-full h-full max-w-6xl">
      <div className="w-full h-full flex flex-col gap-y-8 pt-20 pb-8">
        {/* Header */}
        <div className="flex flex-row justify-between items-center">
          <p className="text-3xl font-bold text-base-content">Projects</p>
          <div className="flex flex-row gap-x-4 justify-end items-center">
            <Link
              href={`${pathname}/settings`}
              className="btn btn-sm btn-outline w-10 h-10 p-0 border-[1px] border-neutral-content hover:bg-neutral-content/20"
            >
              <GearSix
                weight="fill"
                size={20}
                className="text-neutral-content"
              />
            </Link>
            <Link
              href={`${pathname}/projects/new`}
              className="flex flex-row gap-x-2 items-center btn btn-outline btn-sm normal-case font-normal h-10 border-[1px] border-neutral-content hover:bg-neutral-content/20"
            >
              <Plus weight="bold" size={20} className="text-primary" />
              <p className="text-base-content">New Project</p>
            </Link>
          </div>
        </div>
        {/* Projects view */}
        <div className="flex flex-wrap gap-6">
          {projectListData?.map((project) => (
            <ProjectComponent key={project.uuid} project={project} />
          ))}
        </div>
      </div>
    </div>
  );
}

const ProjectComponent = ({ project }: { project: Project }) => {
  const pathname = usePathname();
  return (
    <Link
      href={`${pathname}/projects/${project.uuid}`}
      className={classNames(
        "bg-base-200 rounded-box w-72 h-40 p-5 flex flex-col justify-between items-start gap-y-2",
        "transition-colors hover:bg-base-content/10"
      )}
    >
      <div className="flex flex-col gap-y-2 justify-start items-start">
        <p className="text-xl text-base-content font-medium">{project.name}</p>
        <LocalConnectionStatus
          online={project.online}
          statusType="connection"
        />
      </div>

      <p className="text-sm text-neutral-content">V{project.version}</p>
    </Link>
  );
};
