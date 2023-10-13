import classNames from "classnames";

export const StatusIndicator = ({
  status,
}: {
  status: "broken" | "working" | "candidate" | "deployed" | "published";
}) => {
  return (
    <div
      className={classNames(
        "w-2 h-2 rounded-full",
        (() => {
          switch (status) {
            case "broken":
              return "bg-red-500";
            case "working":
              return "bg-green-500";
            case "candidate":
              return "bg-blue-500";
            case "deployed":
              return "bg-blue-500";
            case "published":
              return "bg-secondary";
          }
        })()
      )}
    />
  );
};
