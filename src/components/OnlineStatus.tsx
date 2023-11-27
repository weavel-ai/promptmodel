import classNames from "classnames";

interface OnlineStatusProps {
  online: boolean;
  mini?: boolean;
}

export function OnlineStatus({ online, mini }: OnlineStatusProps) {
  return (
    <div className="flex flex-row gap-x-2 items-center">
      <div
        className={classNames(
          "w-2 h-2 rounded-full",
          online ? "bg-green-500" : "bg-gray-500"
        )}
      />
      {!mini && (
        <p className="text-sm text-neutral-content">
          {online ? "Online" : "Offline"}
        </p>
      )}
    </div>
  );
}
