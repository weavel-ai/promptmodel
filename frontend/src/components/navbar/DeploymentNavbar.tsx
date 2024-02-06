"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ENV } from "@/constants";
import classNames from "classnames";
import { useParams, usePathname, useRouter } from "next/navigation";
import { OrganizationSwitcher } from "@clerk/nextjs";
import { useAuth } from "@/hooks/auth/useAuth";
import { useOrganization } from "@/hooks/auth/useOrganization";
import { SignInButton } from "../buttons/SignInButton";
import { useMediaQuery } from "react-responsive";
import { AnimatedUnderline } from "../AnimatedUnderline";
import {
  ArrowRight,
  CaretRight,
  Globe,
  List,
  ShareNetwork,
  X,
} from "@phosphor-icons/react";
import { Roboto_Mono } from "next/font/google";
import { useOrgData } from "@/hooks/useOrgData";
import { useProject } from "@/hooks/useProject";
import { useFunctionModel } from "@/hooks/useFunctionModel";
import { SelectNavigator } from "../SelectNavigator";
import { useChatModel } from "@/hooks/useChatModel";
import { LocalConnectionStatus } from "../LocalConnectionStatus";
import { updateOrganization } from "@/apis/organizations";
import { useOrganizationBySlug } from "@/hooks/useOrganizationBySlug";
import { PromptmodelLogo } from "../logos/PromptmodelLogo";
import { WeavelLogo } from "../logos/WeavelLogo";
import { Drawer } from "../Drawer";

const robotoMono = Roboto_Mono({
  weight: ["400"],
  subsets: ["latin"],
});

export function DeploymentNavbar() {
  const pathname = usePathname();
  const params = useParams();
  const router = useRouter();
  const { isSignedIn, userId } = useAuth();
  const { organizationDataBySlug } = useOrganizationBySlug();
  const { organization } = useOrganization();
  const { orgData, refetchOrgData } = useOrgData();
  const { projectData, projectListData } = useProject();
  const { functionModelListData } = useFunctionModel();
  const { chatModelListData } = useChatModel();
  const [isMenuDrawerOpen, setIsMenuDrawerOpen] = useState(false);
  // Mobile
  const isMobile = useMediaQuery({ query: "(max-width: 768px)" });
  const [showDropdown, setShowDropdown] = useState(false);

  const modelType = useMemo(() => {
    if (params?.functionModelUuid) return "FunctionModel";
    if (params?.chatModelUuid) return "ChatModel";

    return null;
  }, [params?.functionModelUuid, params?.chatModelUuid]);

  useEffect(() => {
    if (isMobile) {
      setShowDropdown(false);
    }
  }, [pathname, isMobile, setShowDropdown]);

  useEffect(() => {
    if (
      organization?.name &&
      organization?.slug &&
      orgData?.name &&
      orgData?.slug
    ) {
      if (
        orgData.name != organization?.name ||
        orgData.slug != organization?.slug
      ) {
        updateOrganization({
          organization_id: organization?.id,
          name: organization?.name,
          slug: organization?.slug,
        }).then(() => {
          refetchOrgData();
        });
        // From the current route path, replace the current org_slug with the new org_slug
        const newPathname = pathname.replace(
          /\/org\/[^/]+/,
          `/org/${organization?.slug}`
        );
        router.push(newPathname);
      }
    }
  }, [
    orgData,
    organization?.id,
    organization?.name,
    organization?.slug,
    pathname,
    router,
    refetchOrgData,
  ]);

  return (
    <div
      className={classNames(
        "w-screen",
        // pathname.match(/.*\/org\/[^/]+$/) ||
        //   pathname.match(/.*\/org\/[^/]+\/settings/) ||
        //   pathname.match(/.*\/org\/[^/]+\/projects\/new/) ||
        //   pathname == "/signup" ||
        //   pathname == "/signin"
        //   ? "max-w-6xl w-full self-center"
        //   : "w-screen",
        "flex justify-center h-12 px-6 transition-all",
        "fixed top-0",
        "bg-base-100/5 backdrop-blur-sm z-50"
      )}
    >
      {
        // Navigation bar content for desktop view
        <div
          className={classNames(
            "flex flex-row justify-between items-center w-full h-full gap-x-4"
          )}
        >
          <div className="flex flex-row justify-start items-center w-full h-full gap-x-2">
            <button
              className="btn btn-square btn-sm btn-ghost"
              onClick={() => setIsMenuDrawerOpen(true)}
            >
              <List size={24} weight="bold" />
            </button>
            <Link href={organization?.slug ? `/org/redirect` : "/"}>
              <PromptmodelLogo />
            </Link>
            {/* Project navigator */}
            <div className="flex flex-row items-center">
              <Link
                className="bg-transparent transition-colors text-base-content rounded-md px-2 py-1 text-sm hover:bg-base-content/10"
                href={`/org/${params?.org_slug}`}
              >
                {organizationDataBySlug?.name}
              </Link>
              {params?.projectUuid && (
                <>
                  <p className="text-lg">/</p>
                  <SelectNavigator
                    statusType="connection"
                    current={{
                      label: projectListData?.find(
                        (project) => project.uuid == params?.projectUuid
                      )?.name,
                      online: projectListData?.find(
                        (project) => project.uuid == params?.projectUuid
                      )?.online,
                      href: `/org/${params?.org_slug}/projects/${params?.projectUuid}/models`,
                    }}
                    options={projectListData?.map((project) => {
                      return {
                        label: project.name,
                        online: project.online,
                        href: `/org/${params?.org_slug}/projects/${project?.uuid}/models`,
                      };
                    })}
                  />
                </>
              )}
            </div>
            <div className="flex flex-row items-center text-sm">
              {modelType && (
                <div className="flex flex-row">
                  <p>{modelType}</p>
                  <CaretRight
                    size={16}
                    weight="bold"
                    className="text-muted-content mx-2 my-auto"
                  />
                </div>
              )}
              {/* FunctionModel navigator */}
              {params?.functionModelUuid && (
                <SelectNavigator
                  statusType="usage"
                  current={{
                    label: functionModelListData?.find(
                      (functionModel) =>
                        functionModel.uuid == params?.functionModelUuid
                    )?.name,
                    online: functionModelListData?.find(
                      (functionModel) =>
                        functionModel.uuid == params?.functionModelUuid
                    )?.online,
                    href: `/org/${params?.org_slug}/projects/${params?.projectUuid}/models/function_models/${params?.functionModelUuid}`,
                  }}
                  options={functionModelListData?.map((functionModel) => {
                    return {
                      label: functionModel.name,
                      online: functionModel.online,
                      href: `/org/${params?.org_slug}/projects/${params?.projectUuid}/models/function_models/${functionModel.uuid}`,
                    };
                  })}
                />
              )}
              {/* ChatModel navigator */}
              {params?.chatModelUuid && (
                <SelectNavigator
                  statusType="usage"
                  current={{
                    label: chatModelListData?.find(
                      (chatModel) => chatModel.uuid == params?.chatModelUuid
                    )?.name,
                    online: chatModelListData?.find(
                      (chatModel) => chatModel.uuid == params?.chatModelUuid
                    )?.online,
                    href: `/org/${params?.org_slug}/projects/${params?.projectUuid}/models/chat_models/${params?.chatModelUuid}`,
                  }}
                  options={chatModelListData?.map((chatModel) => {
                    return {
                      label: chatModel.name,
                      online: chatModel.online,
                      href: `/org/${params?.org_slug}/projects/${params?.projectUuid}/models/chat_models/${chatModel.uuid}`,
                    };
                  })}
                />
              )}
            </div>
          </div>
          <div className="mr-2">
            <LocalConnectionStatus
              online={projectData?.online}
              statusType="connection"
            />
          </div>
          <div className="h-[32px]">
            {ENV?.SELF_HOSTED ? (
              isSignedIn && (
                <div className="py-1 px-2 rounded-md bg-base-300 font-sans font-medium ">
                  {organization?.name}
                </div>
              )
            ) : (
              <OrganizationSwitcher
                hidePersonal
                afterCreateOrganizationUrl="/org/redirect"
                afterSelectOrganizationUrl="/org/redirect"
                createOrganizationUrl="/org/new"
              />
            )}
          </div>
          {!pathname.includes("sign-in") && !pathname.includes("sign-up") && (
            <SignInButton />
          )}
        </div>
      }
      <MenuDrawer
        isOpen={isMenuDrawerOpen}
        onClose={() => setIsMenuDrawerOpen(false)}
      />
    </div>
  );
}

function MenuDrawer({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const params = useParams();
  const { projectUuid } = useProject();

  return (
    <Drawer
      fullHeight
      enableOverlay
      zIndex={9999999}
      overlayClassName="!bg-base-content !opacity-5 transition-all"
      open={isOpen}
      onClose={onClose}
      direction="left"
      classNames="h-full w-[calc(min(50vw, 20rem))] bg-transparent"
    >
      <div
        className={classNames(
          "w-full h-full bg-popover/95 backdrop-blur-sm p-4 flex flex-col justify-start items-start",
          "rounded-r-3xl drop-shadow-2xl"
        )}
      >
        <div className="flex flex-row justify-between items-center w-full mb-2">
          <div className="flex flex-row justify-start items-center gap-x-3 w-fit">
            <PromptmodelLogo />
            <p
              className={classNames(
                "text-sm font-medium bg-clip-text bg-gradient-to-br from-base-content text-transparent to-sky-500",
                robotoMono.className
              )}
            >
              Promptmodel
            </p>
          </div>
          <button className="btn btn-square btn-sm btn-ghost" onClick={onClose}>
            <X size={16} weight="bold" className="text-muted-content" />
          </button>
        </div>
        <Link
          href={`https://analytics.weavel.ai/${params?.org_slug}/projects/${projectUuid}`}
          className={classNames(
            "flex flex-row justify-start items-center gap-x-2 w-full",
            "p-2 rounded-md transition-colors hover:bg-base-content/10 group",
            !projectUuid && "hidden"
          )}
          onClick={onClose}
        >
          <WeavelLogo size={24} />
          <p className="text-sm">Weavel Analytics</p>
          <ArrowRight
            size={16}
            weight="bold"
            className={classNames(
              "text-base-content",
              "transition-all opacity-0 group-hover:opacity-100 group-hover:ml-4"
            )}
          />
        </Link>
        <div className="divider my-0"></div>
        <Link
          href={"/explore"}
          className={classNames(
            "flex flex-row justify-start items-center gap-x-2 w-full",
            "p-2 rounded-md transition-colors hover:bg-base-content/10 group"
          )}
          onClick={onClose}
        >
          <Globe size={24} className="text-base-primary" />
          <p className="text-sm">Explore</p>
          <ArrowRight
            size={16}
            weight="bold"
            className={classNames(
              "text-base-content",
              "transition-all opacity-0 group-hover:opacity-100 group-hover:ml-4"
            )}
          />
        </Link>
      </div>
    </Drawer>
  );
}
