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
import { useOrganizationBySlug } from "@/hooks/useOrganizationBySlug";

const michroma = Michroma({
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
            "flex flex-row justify-between items-center w-full gap-x-4 mt-1"
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
              href={organization?.slug ? `/org/redirect` : "/"}
            >
              {PRODUCT_NAME}
            </Link>
            {/* Project navigator */}
            <div className="flex flex-row items-center ms-2">
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
            {env?.SELF_HOSTED ? (
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
    </div>
  );
}
