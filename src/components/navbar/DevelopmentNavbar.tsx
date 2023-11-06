"use client";

import { PRODUCT_NAME } from "@/constants";
import { useModule } from "@/hooks/dev/useModule";
import { useOrgData } from "@/hooks/useOrgData";
import { useProject } from "@/hooks/useProject";
import classNames from "classnames";
import { Michroma } from "next/font/google";
import { useParams, usePathname } from "next/navigation";
import { SelectNavigator } from "../SelectNavigator";
import React, { useEffect, useMemo, useState } from "react";
import { Cloud, GlobeHemisphereWest, Rocket } from "@phosphor-icons/react";
import { deployCandidates } from "@/apis/dev";
import { useModuleVersion } from "@/hooks/dev/useModuleVersion";
import { useModuleVersionStore } from "@/stores/moduleVersionStore";
import { toast } from "react-toastify";
import { motion } from "framer-motion";
import Link from "next/link";
import { ModalPortal } from "../ModalPortal";
import { useDevBranch } from "@/hooks/useDevBranch";

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
  const { devBranchData } = useDevBranch();
  const { moduleListData } = useModule();

  const projectName = useMemo(
    () =>
      projectListData?.find((project) => project.uuid == params?.projectUuid)
        ?.name,
    [projectListData]
  );

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
        <div className="flex flex-row justify-between items-center w-full gap-x-4">
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
            <div
              className={classNames(
                "flex flex-row min-w-fit items-center gap-x-2 me-4 bg-[#2C2F41] px-3 py-1 border-[#2C2F41] rounded font-light justify-self-end self-center",
                "tooltip tooltip-bottom"
              )}
              data-tip={
                devBranchData?.cloud
                  ? "This development environment is saved on the cloud."
                  : "This development environment is saved to your connected local instance."
              }
            >
              {devBranchData?.cloud == true ? (
                <Cloud size={24} weight="fill" />
              ) : (
                <GlobeHemisphereWest size={24} weight="fill" />
              )}
              {devBranchData?.name}
            </div>
            <DeployCandidatesButton />
          </div>
        </div>
      }
    </div>
  );
};

const DeployCandidatesButton = () => {
  const [isOpen, setIsOpen] = useState(false);
  const params = useParams();
  const { projectUuid, projectListData } = useProject();
  const { moduleListData, refetchModuleListData } = useModule();
  const { versionListData, refetchVersionListData } = useModuleVersion();

  const deployAll = useMemo(() => {
    if (params?.moduleUuid) return false;
    return true;
  }, [params?.moduleUuid]);

  const candidateVersionList = useMemo(() => {
    if (versionListData == null) return [];
    return versionListData?.filter(
      (version) =>
        version.candidate_version == null && version.status == "candidate"
    );
  }, [versionListData]);

  const moduleName = useMemo(
    () =>
      moduleListData?.find((module) => module.uuid == params?.moduleUuid)?.name,
    [moduleListData, deployAll]
  );

  const disabled = useMemo(() => {
    if (deployAll) {
      return false;
    } else {
      return candidateVersionList?.length == 0;
    }
  }, [candidateVersionList, deployAll, versionListData]);

  async function handleClickDeploy() {
    const toastId = toast.loading(
      deployAll
        ? "Deploying all local candidates..."
        : `Deploying candidates for ${moduleName}...`
    );
    try {
      await deployCandidates({
        projectUuid: projectUuid,
        devName: params?.devName as string,
        moduleUuid: deployAll ? null : (params?.moduleUuid as string),
      });
      toast.update(toastId, {
        render: "Successfully deployed candidates!",
        type: "success",
        isLoading: false,
        autoClose: 2000,
      });
      if (deployAll) {
        refetchModuleListData();
      } else {
        refetchVersionListData();
      }
    } catch (e) {
      toast.update(toastId, {
        render: `Failed to deploy candidates: ${e}`,
        type: "error",
        isLoading: false,
        autoClose: 2000,
      });
    }
  }
  return (
    <button
      onClick={() => setIsOpen(true)}
      className={classNames(
        "min-w-fit h-fit flex flex-row px-3 py-2 items-center gap-x-2 group",
        "bg-secondary-content rounded-lg font-medium btn btn-sm normal-case hover:bg-secondary-content",
        "disabled:bg-neutral-content"
      )}
      disabled={disabled}
    >
      {/* <motion.div whileHover={{ scale: 1.1, rotateY: 45 }}> */}
      <Rocket
        className={classNames(
          "text-base-100 transition-all",
          "group-hover:text-red-500 group-hover:rotate-45 group-hover:animate-pulse"
        )}
        size={24}
      />
      {/* </motion.div> */}
      <p className="text-base-100 text-sm">
        {deployAll ? "Deploy All" : "Deploy Candidates"}
      </p>
      {isOpen && (
        <ModalPortal>
          <div className="fixed inset-0 backdrop-blur-sm w-full h-full flex justify-center items-center z-[999999]">
            <motion.div
              className="flex flex-col p-8 bg-base-200 rounded-xl min-w-[16rem] max-w-2xl w-fit gap-y-4 shadow-2xl shadow-secondary/30"
              initial={{
                opacity: 0,
                scale: 0.5,
              }}
              animate={{
                opacity: 1,
                scale: 1,
              }}
            >
              <p className="text-2xl font-bold text-base-content self-start">
                Confirm deployment
              </p>
              {deployAll ? (
                <p className="text-base-content self-start">
                  All local candidate versions and created Promptmodels will be
                  deployed to production.
                </p>
              ) : (
                <p className="text-base-content self-start">
                  <span className="text-xl font-semibold text-secondary">
                    {candidateVersionList?.length}
                  </span>
                  &nbsp;candidate versions for PromptModel
                  <span className="text-secondary font-medium">
                    &nbsp;{moduleName}&nbsp;
                  </span>
                  will be deployed to production.
                </p>
              )}
              <div className="flex flex-row justify-end items-center gap-x-4 mt-4">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsOpen(false);
                  }}
                  className="btn bg-neutral/50"
                >
                  Cancel
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleClickDeploy();
                    setIsOpen(false);
                  }}
                  className="btn bg-base-content text-primary hover:bg-secondary hover:text-secondary-content"
                >
                  Deploy 🚀
                </button>
              </div>
            </motion.div>
          </div>
        </ModalPortal>
      )}
    </button>
  );
};
