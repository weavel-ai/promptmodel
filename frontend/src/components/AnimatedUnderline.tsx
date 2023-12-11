import classNames from "classnames";

export const AnimatedUnderline = () => {
  return (
    <div
      className={classNames(
        "absolute left-0 right-0 h-0.5 bg-secondary-content",
        "transform-gpu origin-left scale-x-0 transition-transform duration-300 ease-in-out",
        "group-hover:scale-x-100"
      )}
    ></div>
  );
};
