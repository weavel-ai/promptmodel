"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { PRODUCT_NAME, env } from "@/constants";
import classNames from "classnames";
import {
  useParams,
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation";
import { OrganizationSwitcher } from "@clerk/nextjs";
import { useAuth } from "@/hooks/auth/useAuth";
import { useOrganization } from "@/hooks/auth/useOrganization";
import { SignInButton } from "../buttons/SignInButton";
import { useMediaQuery } from "react-responsive";
import { AnimatedUnderline } from "../AnimatedUnderline";
import { CaretRight } from "@phosphor-icons/react";
import { Michroma, Russo_One } from "next/font/google";
import { useOrgData } from "@/hooks/useOrgData";
import { useProject } from "@/hooks/useProject";
import { useFunctionModel } from "@/hooks/useFunctionModel";
import { SelectNavigator } from "../SelectNavigator";
import { useChatModel } from "@/hooks/useChatModel";
import { LocalConnectionStatus } from "../LocalConnectionStatus";
import { updateOrganization } from "@/apis/organizations";

const michroma = Michroma({
  weight: ["400"],
  subsets: ["latin"],
});

interface NavbarProps {
  title?: string;
}

export const DeploymentNavbar = (props: NavbarProps) => {
  const pathname = usePathname();
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { isSignedIn, userId } = useAuth();
  const { organization } = useOrganization();
  const { orgData, refetchOrgData } = useOrgData();
  const { projectData, projectListData } = useProject();
  const { functionModelListData } = useFunctionModel();
  const { chatModelListData } = useChatModel();
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
        pathname.match(/.*\/org\/[^/]+$/) ||
          pathname.match(/.*\/org\/[^/]+\/settings/) ||
          pathname.match(/.*\/org\/[^/]+\/projects\/new/) ||
          pathname == "/signup" ||
          pathname == "/signin"
          ? "max-w-6xl w-full self-center"
          : "w-screen",
        "flex justify-center h-12 py-2 px-6 transition-all",
        "fixed top-0",
        "bg-base-100/5 backdrop-blur-sm z-50"
      )}
    >
      {
        // Navigation bar content for desktop view
        <div
          className={classNames(
            "flex flex-row justify-between items-center w-full gap-x-4"
          )}
        >
          <div className="flex flex-row justify-start items-center w-full gap-x-4">
            <Link
              className={classNames(
                "btn btn-link px-0 normal-case no-underline hover:no-underline flex-0",
                "text-lg font-extrabold text-transparent bg-clip-text bg-white",
                "transition-colors hover:bg-gradient-to-br from-white to-primary",
                michroma.className
              )}
              href={organization?.slug ? `/org/${organization.slug}` : "/"}
            >
              {PRODUCT_NAME}
            </Link>
            {pathname == "/" ? (
              <div className="px-6 pt-1 group justify-center">
                <Link
                  href="https://www.promptmodel.run/docs"
                  target="_blank"
                  className={classNames("relative")}
                >
                  <p className="font-semibold">Docs</p>
                  <AnimatedUnderline />
                </Link>
              </div>
            ) : (
              <div className="h-[32px]">
                {env?.SELF_HOSTED ? (
                  <div className="py-1 px-2 rounded-md bg-base-300 font-sans font-medium ">
                    {organization?.name}
                  </div>
                ) : (
                  <OrganizationSwitcher
                    hidePersonal
                    afterCreateOrganizationUrl="/org/redirect"
                    afterSelectOrganizationUrl="/org/redirect"
                    createOrganizationUrl="/org/new"
                  />
                )}
              </div>
            )}
            {/* Project navigator */}
            {params?.projectUuid && (
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
            )}
            <div className="flex flex-row items-center">
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
          {!pathname.includes("sign-in") && !pathname.includes("sign-up") && (
            <SignInButton />
          )}
        </div>
      }
    </div>
  );
};
