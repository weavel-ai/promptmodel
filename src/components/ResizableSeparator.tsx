import classNames from "classnames";

export const ResizableSeparator = ({ height, setHeight }) => {
  return (
    <div
      className={classNames(
        "absolute left-0 right-0 h-[0.4rem] cursor-row-resize bg-base-content/70 rounded-full",
        "transition-colors hover:bg-blue-500/70 active:bg-blue-500/70 focus:bg-blue-500/70 active:select-none focus:select-none"
      )}
      {...registerMouseDownDrag((deltaX, deltaY) => {
        console.log(height, deltaY);
        if (height - deltaY > window.innerHeight - 160) {
          return;
        }
        if (height - deltaY < 100) return;
        setHeight(height - deltaY);
      }, true)}
    />
  );
};

function registerMouseDownDrag(
  onDragChange: (deltaX: number, deltaY: number) => void,
  stopPropagation?: boolean
) {
  return {
    onMouseDown: (clickEvent: React.MouseEvent<Element, MouseEvent>) => {
      if (stopPropagation) clickEvent.stopPropagation();

      const mouseMoveHandler = (moveEvent: MouseEvent) => {
        const deltaX = moveEvent.screenX - clickEvent.screenX;
        const deltaY = moveEvent.screenY - clickEvent.screenY;
        onDragChange(deltaX, deltaY);
      };

      const mouseUpHandler = () => {
        document.removeEventListener("mousemove", mouseMoveHandler);
      };

      document.addEventListener("mousemove", mouseMoveHandler);
      document.addEventListener("mouseup", mouseUpHandler, { once: true });

      // Handle touch events
      const touchMoveHandler = (moveEvent: TouchEvent) => {
        const deltaX = moveEvent.touches[0].screenX - clickEvent.screenX;
        const deltaY = moveEvent.touches[0].screenY - clickEvent.screenY;
        onDragChange(deltaX, deltaY);
      };

      const touchEndHandler = () => {
        document.removeEventListener("touchmove", touchMoveHandler);
      };

      document.addEventListener("touchmove", touchMoveHandler);
      document.addEventListener("touchend", touchEndHandler, { once: true });
    },
  };
}
