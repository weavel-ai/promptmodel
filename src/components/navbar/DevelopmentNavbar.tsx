"use client";

import { PRODUCT_NAME } from "@/constants";
import { useModule } from "@/hooks/dev/useModule";
import { useOrgData } from "@/hooks/useOrgData";
import { useProject } from "@/hooks/useProject";
import classNames from "classnames";
import { Michroma } from "next/font/google";
import { useParams, usePathname } from "next/navigation";
import { SelectNavigator } from "../SelectNavigator";
import { useMemo } from "react";
import { GlobeHemisphereWest, Rocket } from "@phosphor-icons/react";
import { deployVersion } from "@/apis/dev";
import { useModuleVersion } from "@/hooks/dev/useModuleVersion";
import { useModuleVersionStore } from "@/stores/moduleVersionStore";
import { toast } from "react-toastify";
import Link from "next/link";

const michroma = Michroma({
  weight: ["400"],
  subsets: ["latin"],
});

interface NavbarProps {
  title?: string;
  trailingComponent?: React.ReactElement;
}

export const DevelopmentNavbar = (props: NavbarProps) => {
  const pathname = usePathname();
  const params = useParams();
  const { orgData, refetchOrgData } = useOrgData();
  const { projectUuid, projectListData } = useProject();
  const { moduleListData } = useModule();
  const { versionListData } = useModuleVersion();
  const { runLogs, prompts } = useModuleVersionStore();

  const projectName = useMemo(
    () =>
      projectListData?.find((project) => project.uuid == params?.projectUuid)
        ?.name,
    [projectListData]
  );

  const moduleName = useMemo(
    () =>
      moduleListData?.find((module) => module.uuid == params?.moduleUuid)?.name,
    [moduleListData]
  );

  const candidateVersionList = useMemo(() => {
    if (versionListData == null) return [];
    return versionListData?.filter(
      (version) =>
        version.candidate_version == null && version.status == "candidate"
    );
  }, [versionListData]);

  async function handleClickDeploy() {
    //TODO
    const toastId = toast.loading("Deploying candidates...");
    try {
      for (const version of candidateVersionList) {
        await deployVersion({
          projectUuid: projectUuid,
          moduleName: moduleName,
          moduleUuid: params?.moduleUuid as string,
          fromUuid: version.from_uuid,
          runLogs: [runLogs[version.uuid]],
          prompts: prompts[version.uuid],
        });
        toast.update(toastId, {
          progress:
            (candidateVersionList.indexOf(version) + 1) /
            candidateVersionList.length,
        });
      }
      toast.update(toastId, {
        render: "Deployed candidates successfully!",
        type: "success",
        autoClose: 2000,
        progress: 1,
      });
    } catch (e) {
      toast.update(toastId, {
        render: `Failed to deploy candidates: ${e}`,
        type: "error",
        autoClose: 2000,
        progress: 1,
      });
    }
  }

  return (
    <div
      className={classNames(
        pathname.match(/.*\/org\/[^/]+$/) ||
          pathname.match(/.*\/org\/[^/]+\/settings/) ||
          pathname.match(/.*\/org\/[^/]+\/projects\/new/)
          ? "max-w-6xl w-full self-center"
          : "w-screen",
        "flex justify-center h-12 px-4 transition-all",
        "fixed top-0",
        "bg-base-100/5 backdrop-blur-sm z-50"
      )}
    >
      {
        <div className="flex flex-row justify-between items-center max-w-[1540px] w-full gap-x-4">
          {/* Development Page Navbar */}
          <div className="flex flex-row justify-start items-center w-full gap-x-2">
            <Link
              href="/org/redirect"
              className={classNames(
                "btn btn-link px-0 normal-case no-underline hover:no-underline flex-0",
                "text-lg font-extrabold text-transparent bg-clip-text bg-white",
                "transition-colors hover:bg-gradient-to-br from-white to-primary",
                michroma.className
              )}
            >
              {PRODUCT_NAME}
            </Link>
            <div className="ms-8 px-3 py-1 font-light">{orgData?.name}</div>
            <Link
              href={`${pathname.split("/").slice(0, -1).join("/")}`}
              className="bg-base-content/10 rounded-md ms-2 mr-2 px-3 py-1 font-light"
            >
              {projectName}
            </Link>
            <div>
              {params?.moduleUuid && (
                <SelectNavigator
                  current={{
                    label: moduleListData?.find(
                      (module) => module.uuid == params?.moduleUuid
                    )?.name,
                    href: `/org/${params?.org_slug}/projects/${params?.projectUuid}/dev/${params?.devName}/modules/${params?.moduleUuid}`,
                  }}
                  options={moduleListData?.map((module) => {
                    return {
                      label: module.name,
                      href: `/org/${params?.org_slug}/projects/${params?.projectUuid}/dev/${params?.devName}/modules/${module.uuid}`,
                    };
                  })}
                />
              )}
            </div>
          </div>
          <div className="min-w-fit me-2 flex flex-row gap-x-2 items-center">
            <div className="flex flex-row min-w-fit items-center gap-x-2 me-4 bg-[#2C2F41] px-3 py-1 border-[#2C2F41] rounded font-light justify-self-end self-center">
              <GlobeHemisphereWest size={24} />
              {params?.devName}
            </div>
            <button
              onClick={handleClickDeploy}
              className={classNames(
                "min-w-fit h-fit flex flex-row px-3 py-2 items-center gap-x-2",
                "bg-secondary-content rounded-lg font-medium btn btn-sm normal-case hover:bg-base-content/70",
                "disabled:bg-neutral-content"
              )}
              disabled={candidateVersionList?.length == 0}
            >
              <Rocket className="text-base-100" size={24} />
              <p className="text-base-100 text-sm">Deploy Candidates</p>
            </button>
          </div>
        </div>
      }
    </div>
  );
};
