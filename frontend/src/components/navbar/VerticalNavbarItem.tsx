"use client";

import classNames from "classnames";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";

export function VerticalNavbarItem({
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
}) {
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
}
