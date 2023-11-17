"use client";

import classNames from "classnames";
import dayjs from "dayjs";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function ModelNode({ data }) {
  const pathname = usePathname();
  return (
    <Link
      href={`${pathname}/${
        data.type == "PromptModel" ? "prompt_models" : "chat_models"
      }/${data.uuid}`}
      className={classNames(
        "bg-base-200 p-4 rounded-box flex flex-col gap-y-2 justify-start items-start",
        "w-[16rem] h-[9rem] visible",
        "transition-colors hover:bg-base-300"
      )}
    >
      <p className="text-base-content font-bold text-lg">{data.name}</p>
      <p className="text-neutral-content font-medium text-sm">
        {dayjs(data.created_at).fromNow()}
      </p>
    </Link>
  );
}
