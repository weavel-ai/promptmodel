import EZDrawer from "react-modern-drawer";
import "react-modern-drawer/dist/index.css";

interface DrawerProps {
  open: boolean;
  direction: "left" | "right" | "top" | "bottom";
  children: React.ReactNode;
  onClose?: () => void;
  classNames?: string;
  duration?: number;
}

export const Drawer = ({
  open,
  direction,
  children,
  onClose,
  classNames,
  duration,
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
        marginTop: "3rem",
        height: "calc(100% - 3rem)",
      }}
      duration={duration}
    >
      {children}
    </EZDrawer>
  );
};
