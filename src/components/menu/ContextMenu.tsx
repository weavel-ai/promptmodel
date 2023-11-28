import { Icon, IconProps } from "@phosphor-icons/react";
import classNames from "classnames";
import { ForwardRefExoticComponent, ReactElement, ReactNode } from "react";

export function ContextMenu({
  onClick,
  children,
  menuData,
}: {
  onClick: () => void;
  children: ReactNode | ReactNode[];
  menuData: {
    id: string;
    left?: number;
    right?: number;
    top?: number;
    bottom?: number;
  };
}) {
  return (
    <div
      className={classNames(
        "fixed rounded-lg flex flex-col bg-popover/80 backdrop-blur-sm text-base-content h-10 w-10 z-[100]",
        "w-fit h-fit"
      )}
      style={{
        left: menuData.left ? menuData.left : "auto",
        right: menuData.right ? menuData.right : "auto",
        top: menuData.top ? menuData.top : "auto",
        bottom: menuData.bottom ? menuData.bottom : "auto",
      }}
    >
      {children}
    </div>
  );
}

export function ContextMenuItem({
  icon,
  label,
  onClick,
  className,
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      className={classNames(
        "h-fit w-full bg-transparent rounded-lg py-2 px-4 text-start flex flex-row gap-x-2 items-center",
        "transition-all hover:bg-base-content/20",
        className
      )}
      onClick={onClick}
    >
      {icon}
      <p>{label}</p>
    </button>
  );
}
