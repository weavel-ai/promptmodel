import { useEffect, useRef } from "react";
import { ModalPortal } from "../ModalPortal";
import classNames from "classnames";
import { motion } from "framer-motion";
import { useHotkeys } from "react-hotkeys-hook";

export const Modal = ({
  isOpen,
  setIsOpen,
  zIndex = 50,
  children,
}: {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  zIndex?: number;
  children: React.ReactNode;
}) => {
  const modalRef = useRef(null);

  useHotkeys(
    "esc",
    () => {
      setIsOpen(false);
    },
    [isOpen]
  );

  // Use useEffect to add an event listener to the document
  useEffect(() => {
    function handleOutsideClick(event) {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        if (modalRef.current) {
          setIsOpen(false);
        }
      }
    }
    // Attach the click event listener
    document.addEventListener("mousedown", handleOutsideClick);
    // Clean up the listener when the component is unmounted
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, []);

  return (
    <ModalPortal>
      <motion.div
        className={classNames(
          "w-full h-full fixed inset-0 flex justify-center items-center",
          `z-[${zIndex}]`
        )}
        initial={{ opacity: 0 }}
        animate={{
          opacity: open ? 1 : 0,
          backdropFilter: open ? "blur(4px)" : "blur(0px)",
          transition: {
            duration: 0.3,
          },
        }}
      >
        <motion.div
          ref={modalRef}
          className={classNames("w-fit h-fit")}
          initial={{ opacity: 0, scale: 0.8, marginTop: 360 }}
          animate={{
            opacity: open ? 1 : 0,
            scale: open ? 1 : 0,
            marginTop: open ? 0 : 360,
            transition: {
              duration: 0.2,
            },
          }}
        >
          {children}
        </motion.div>
      </motion.div>
    </ModalPortal>
  );
};
