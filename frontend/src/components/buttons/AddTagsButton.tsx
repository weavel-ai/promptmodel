import { Plus } from "@phosphor-icons/react";
import classNames from "classnames";

export function AddTagsButton({
  onClick,
  className,
}: {
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      className={classNames(
        "flex flex-row gap-x-2 rounded-full px-2 py-1 btn btn-xs btn-outline outline-1 outline-base-content bg-transparent text-base-content",
        "hover:bg-base-content/10 hover:text-base-content normal-case font-medium",
        className
      )}
      onClick={onClick}
    >
      <Plus weight="bold" />
      <p>Add tags</p>
    </button>
  );
}
