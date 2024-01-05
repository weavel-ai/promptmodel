import EZDrawer from "react-modern-drawer";
import "react-modern-drawer/dist/index.css";

interface DrawerProps {
  open: boolean;
  direction: "left" | "right" | "top" | "bottom";
  children: React.ReactNode;
  fullHeight?: boolean;
  onClose?: () => void;
  classNames?: string;
  duration?: number;
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
  fullHeight = false,
}: DrawerProps) => {
  return (
    <EZDrawer
      open={open}
      direction={direction}
      enableOverlay={false}
      zIndex={500}
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
