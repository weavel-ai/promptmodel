import classNames from "classnames";
import { useMemo } from "react";

interface LocalConnectionStatusProps {
  online: boolean;
  statusType: "connection" | "usage";
  mini?: boolean;
}

export function LocalConnectionStatus({
  online,
  statusType,
  mini,
}: LocalConnectionStatusProps) {
  const statusColor = useMemo(() => {
    if (!online) return "bg-gray-500";
    if (statusType == "connection") {
      return "bg-green-500";
    } else if (statusType == "usage") {
      return "bg-primary";
    }
  }, [online, statusType]);

  const statusText = useMemo(() => {
    if (statusType == "connection") {
      return online ? "Connected" : "Cloud";
    } else if (statusType == "usage") {
      return online ? "Used" : "Unused";
    }
  }, [online, statusType]);

  if (statusType == "usage" && !online) return null;

  return (
    <div className="flex flex-row gap-x-2 items-center">
      <div className={classNames("w-2 h-2 rounded-full", statusColor)} />
      {!mini && <p className="text-sm text-neutral-content">{statusText}</p>}
    </div>
  );
}
