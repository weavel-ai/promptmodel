"use client";

import classNames from "classnames";
import dayjs from "dayjs";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LocalConnectionStatus } from "../LocalConnectionStatus";

export function ModelNode({ data }) {
  const pathname = usePathname();
  return (
    <Link
      href={`${pathname}/${
        data.type == "FunctionModel" ? "function_models" : "chat_models"
      }/${data.uuid}`}
      className={classNames(
        "bg-base-200 p-4 rounded-box flex flex-col gap-y-2 justify-between items-start",
        "w-[16rem] h-[9rem] visible",
        "transition-colors hover:bg-base-300"
      )}
    >
      <div className="flex flex-col justify-start gap-y-2 items-start">
        <p className="text-base-content font-bold text-lg">{data.name}</p>
        <LocalConnectionStatus online={data?.online} statusType="usage" />
      </div>
      <p className="text-neutral-content text-sm">
        Created {dayjs(data.created_at).fromNow()}
      </p>
    </Link>
  );
}
