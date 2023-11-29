import classNames from "classnames";

interface LocalConnectionStatusProps {
  online: boolean;
  mini?: boolean;
}

export function LocalConnectionStatus({
  online,
  mini,
}: LocalConnectionStatusProps) {
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
          {online ? "Connected" : "Cloud"}
        </p>
      )}
    </div>
  );
}
