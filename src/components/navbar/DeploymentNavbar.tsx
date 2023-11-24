"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { PRODUCT_NAME } from "@/constants";
import classNames from "classnames";
import {
  useParams,
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation";
import {
  OrganizationSwitcher,
  useAuth,
  useOrganization,
  useUser,
} from "@clerk/nextjs";
import { SignInButton } from "../buttons/SignInButton";
import { useMediaQuery } from "react-responsive";
import { AnimatedUnderline } from "../AnimatedUnderline";
import { useSupabaseClient } from "@/apis/base";
import {
  ArrowRight,
  CaretRight,
  CaretUpDown,
  List,
  X,
} from "@phosphor-icons/react";
import { Michroma, Russo_One } from "next/font/google";
import { fetchOrganization, updateOrganization } from "@/apis/organization";
import { useOrgData } from "@/hooks/useOrgData";
import { useProject } from "@/hooks/useProject";
import { usePromptModel } from "@/hooks/usePromptModel";
import { SelectNavigator } from "../SelectNavigator";
import { useChatModel } from "@/hooks/useChatModel";

const michroma = Michroma({
  weight: ["400"],
  subsets: ["latin"],
});

interface NavbarProps {
  title?: string;
  trailingComponent?: React.ReactElement;
}

export const DeploymentNavbar = (props: NavbarProps) => {
  const pathname = usePathname();
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { createSupabaseClient } = useSupabaseClient();
  const { isSignedIn, userId } = useAuth();
  const { organization } = useOrganization();
  const { orgData, refetchOrgData } = useOrgData();
  const { projectListData } = useProject();
  const { promptModelListData } = usePromptModel();
  const { chatModelListData } = useChatModel();
  // Mobile
  const isMobile = useMediaQuery({ query: "(max-width: 768px)" });
  const [showDropdown, setShowDropdown] = useState(false);

  const modelType = useMemo(() => {
    if (params?.promptModelUuid) return "PromptModel";
    if (params?.chatModelUuid) return "ChatModel";

    return null;
  }, [params?.promptModelUuid, params?.chatModelUuid]);

  useEffect(() => {
    if (isMobile) {
      setShowDropdown(false);
    }
  }, [pathname]);

  useEffect(() => {
    if (organization?.name && organization?.slug && orgData) {
      createSupabaseClient().then(async (supabase) => {
        if (
          orgData.name != organization?.name ||
          orgData.slug != organization?.slug
        ) {
          await updateOrganization(
            supabase,
            organization?.id,
            organization?.name,
            organization?.slug
          );
          // From the current route path, replace the current org_slug with the new org_slug
          const newPathname = pathname.replace(
            /\/org\/[^/]+/,
            `/org/${organization?.slug}`
          );
          router.push(newPathname);
          refetchOrgData();
        }
      });
    }
  }, [orgData, organization?.name, organization?.slug]);

  return (
    <div
      className={classNames(
        pathname.match(/.*\/org\/[^/]+$/) ||
          pathname.match(/.*\/org\/[^/]+\/settings/) ||
          pathname.match(/.*\/org\/[^/]+\/projects\/new/) ||
          pathname == "/signup" ||
          pathname == "/signin"
          ? "max-w-6xl w-full self-center"
          : "w-screen px-6",
        "flex justify-center h-12 py-2 transition-all",
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
                <OrganizationSwitcher
                  hidePersonal
                  afterCreateOrganizationUrl="/org/redirect"
                  afterSelectOrganizationUrl="/org/redirect"
                  createOrganizationUrl="/org/new"
                />
              </div>
            )}
            {/* Project navigator */}
            {params?.projectUuid && organization && (
              <SelectNavigator
                current={{
                  label: projectListData?.find(
                    (project) => project.uuid == params?.projectUuid
                  )?.name,
                  href: `/org/${params?.org_slug}/projects/${params?.projectUuid}/models`,
                }}
                options={projectListData?.map((project) => {
                  return {
                    label: project.name,
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
              {/* PromptModel navigator */}
              {params?.promptModelUuid && organization && (
                <SelectNavigator
                  current={{
                    label: promptModelListData?.find(
                      (promptModel) =>
                        promptModel.uuid == params?.promptModelUuid
                    )?.name,
                    href: `/org/${params?.org_slug}/projects/${params?.projectUuid}/models/prompt_models/${params?.promptModelUuid}`,
                  }}
                  options={promptModelListData?.map((promptModel) => {
                    return {
                      label: promptModel.name,
                      href: `/org/${params?.org_slug}/projects/${params?.projectUuid}/models/prompt_models/${promptModel.uuid}`,
                    };
                  })}
                />
              )}
              {/* ChatModel navigator */}
              {params?.chatModelUuid && organization && (
                <SelectNavigator
                  current={{
                    label: chatModelListData?.find(
                      (chatModel) => chatModel.uuid == params?.chatModelUuid
                    )?.name,
                    href: `/org/${params?.org_slug}/projects/${params?.projectUuid}/models/chat_models/${params?.chatModelUuid}`,
                  }}
                  options={chatModelListData?.map((chatModel) => {
                    return {
                      label: chatModel.name,
                      href: `/org/${params?.org_slug}/projects/${params?.projectUuid}/models/chat_models/${chatModel.uuid}`,
                    };
                  })}
                />
              )}
            </div>
          </div>
          {props.trailingComponent}
          {pathname == "/" && isSignedIn && (
            <div className="px-6 pt-1 group justify-center">
              <Link
                href="/org/redirect"
                target="_blank"
                className={classNames("relative")}
              >
                <p className="font-semibold">Dashboard</p>
                <AnimatedUnderline />
              </Link>
            </div>
          )}
          {!pathname.includes("sign-in") && !pathname.includes("sign-up") && (
            <SignInButton />
          )}
        </div>
      }
    </div>
  );
};
