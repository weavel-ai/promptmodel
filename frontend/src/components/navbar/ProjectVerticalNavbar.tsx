"use client";

import { useChatModelVersionStore } from "@/stores/chatModelVersionStore";
import { useFunctionModelVersionStore } from "@/stores/functionModelVersionStore";
import {
  DiscordLogo,
  GearSix,
  Info,
  Notebook,
  SquaresFour,
  Table,
} from "@phosphor-icons/react";
import classNames from "classnames";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { useEffect } from "react";
import { useAuthorization } from "@/hooks/auth/useAuthorization";

export const ProjectVerticalNavbar = () => {
  const params = useParams();
  const { isAuthorizedForProject } = useAuthorization();
  const {
    isCreateVariantOpen: isCreateChatModelVariantOpen,
    setIsCreateVariantOpen: setIsCreateChatModelVariantOpen,
  } = useChatModelVersionStore();
  const {
    isCreateVariantOpen: isCreateFunctionModelVariantOpen,
    setIsCreateVariantOpen: setIsCreateFunctionModelVariantOpen,
  } = useFunctionModelVersionStore();

  useEffect(() => {
    if (!params?.functionModelUuid) {
      setIsCreateFunctionModelVariantOpen(false);
    }
    if (!params?.chatModelUuid) {
      setIsCreateChatModelVariantOpen(false);
    }
  }, [
    params?.functionModelUuid,
    params?.chatModelUuid,
    setIsCreateChatModelVariantOpen,
    setIsCreateFunctionModelVariantOpen,
  ]);

  if (isCreateChatModelVariantOpen || isCreateFunctionModelVariantOpen)
    return null;

  return (
    <div
      className={classNames(
        "w-20 h-full bg-base-100",
        "flex flex-col pt-16 justify-between items-center transition-all",
        "fixed left-0",
        "bg-base-100/5 backdrop-blur-sm z-40"
      )}
    >
      <div className="flex flex-col h-fit gap-y-5 justify-start items-center">
        <VerticalNavbarItem label="Overview" subPath="/overview">
          <Info weight="fill" className="text-base-content" size={20} />
        </VerticalNavbarItem>
        <VerticalNavbarItem label="Models" subPath="/models">
          <SquaresFour weight="fill" className="text-base-content" size={20} />
        </VerticalNavbarItem>
        {isAuthorizedForProject && (
          <VerticalNavbarItem label="Runs" subPath="/runs">
            <Table weight="fill" className="text-base-content" size={20} />
          </VerticalNavbarItem>
        )}
        {isAuthorizedForProject && (
          <VerticalNavbarItem label="Settings" subPath="/settings">
            <GearSix weight="fill" className="text-base-content" size={20} />
          </VerticalNavbarItem>
        )}
      </div>
      <div className="flex flex-col h-fit justify-end pb-8 gap-y-5">
        <VerticalNavbarItem
          label="Docs"
          href="https://www.promptmodel.run/docs"
          external
        >
          <Notebook weight="fill" className="text-base-content" size={20} />
        </VerticalNavbarItem>
        <VerticalNavbarItem
          label="Discord"
          href="https://promptmodel.run/discord"
          external
        >
          <DiscordLogo weight="fill" className="text-base-content" size={20} />
        </VerticalNavbarItem>
      </div>
    </div>
  );
};

const VerticalNavbarItem = ({
  children,
  label,
  subPath,
  href,
  external,
}: {
  children: React.ReactNode;
  label: string;
  subPath?: string;
  href?: string;
  external?: boolean;
}) => {
  const pathname = usePathname();
  const params = useParams();

  return (
    <Link
      href={
        href ??
        `/org/${params?.org_slug}/projects/${params?.projectUuid}${subPath}`
      }
      target={external && "_blank"}
      className={classNames(
        "flex flex-col w-12 gap-y-1 justify-center items-center overflow-ellipsis",
        "transition-all group"
      )}
    >
      <div
        className={classNames(
          "w-10 h-10 rounded-md flex justify-center items-center",
          "transition-colors",
          pathname.includes(subPath)
            ? "bg-secondary group-hover:bg-secondary/70"
            : "bg-base-200 group-hover:bg-base-content/20"
        )}
      >
        {children}
      </div>
      <p
        className={classNames(
          "w-fit text-center text-xs text-ellipsis ",
          "transition-colors",
          pathname.includes(subPath) && "text-secondary"
        )}
      >
        {label}
      </p>
    </Link>
  );
};
