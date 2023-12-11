import classNames from "classnames";

export function GroupNode({ data }) {
  return (
    <div
      className={classNames(
        "bg-base-100/5 rounded-box flex flex-col gap-y-2 justify-start items-start w-full h-full",
        "border-2 border-base-content/50 p-0 pointer-events-none"
      )}
    >
      <p className="text-base-content font-bold text-2xl p-4">{data.label}</p>
    </div>
  );
}
