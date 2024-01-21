import EZDrawer from "react-modern-drawer";
import "react-modern-drawer/dist/index.css";

interface DrawerProps {
  open: boolean;
  direction: "left" | "right" | "top" | "bottom";
  children: React.ReactNode;
  zIndex?: number;
  enableOverlay?: boolean;
  fullHeight?: boolean;
  onClose?: () => void;
  classNames?: string;
  duration?: number;
  overlayClassName?: string;
  style?: React.CSSProperties;
}

export const Drawer = ({
  open,
  direction,
  children,
  onClose,
  classNames,
  duration,
  style,
  overlayClassName,
  zIndex = 500,
  enableOverlay = false,
  fullHeight = false,
}: DrawerProps) => {
  return (
    <EZDrawer
      open={open}
      direction={direction}
      enableOverlay={enableOverlay}
      overlayClassName={overlayClassName}
      zIndex={zIndex}
      lockBackgroundScroll={false}
      onClose={onClose}
      className={classNames}
      style={{
        background: "transparent",
        boxShadow: "none",
        marginTop: !fullHeight && "3rem",
        height: fullHeight ? "100vh" : "calc(100% - 3rem)",
        ...style,
      }}
      duration={duration}
    >
      {children}
    </EZDrawer>
  );
};
