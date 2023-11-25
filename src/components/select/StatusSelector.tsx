import { CaretUpDown } from "@phosphor-icons/react";
import classNames from "classnames";
import { useEffect, useMemo, useRef, useState } from "react";
import { ModalPortal } from "../ModalPortal";
import { motion } from "framer-motion";
import { StatusIndicator } from "../StatusIndicator";

interface StatusSelectorProps {
  status: string;
  setStatus: (name: string) => void;
}

const STATUS_OPTIONS: ("broken" | "working" | "candidate")[] = [
  "broken",
  "working",
  "candidate",
];

export const StatusSelector = (props: StatusSelectorProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [modalPosition, setModalPosition] = useState({
    top: 0,
    left: 0,
  });
  const selectorRef = useRef(null);
  const optionsRef = useRef(null);
  const isOpenRef = useRef(isOpen); // Create a ref to hold the isOpen state

  useEffect(() => {
    isOpenRef.current = isOpen; // Always keep it updated with the latest state
  }, [isOpen]);

  // Use useEffect to add an event listener to the document
  useEffect(() => {
    function handleOutsideClick(event) {
      if (
        optionsRef.current &&
        !optionsRef.current.contains(event.target) &&
        !selectorRef.current.contains(event.target)
      ) {
        if (isOpenRef.current) {
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

  const selectedStatus = useMemo(() => {
    return STATUS_OPTIONS?.find((status) => status === props.status);
  }, [props.status, STATUS_OPTIONS]);

  function handleClickOpen() {
    if (!isOpen) {
      const selectorRect = selectorRef.current?.getBoundingClientRect();
      setModalPosition({
        top: selectorRect.top + selectorRect.height,
        left: selectorRect.left,
      });
    }
    setIsOpen(!isOpen);
  }

  return (
    <div
      ref={selectorRef}
      className={classNames(
        "flex flex-row justify-between items-center p-2 rounded-md bg-base-content/10 text-base-content cursor-pointer",
        "transition-all hover:bg-base-content/20 max-w-[11rem]"
      )}
      onClick={handleClickOpen}
    >
      <StatusIndicator status={selectedStatus} />
      <p className="truncate text-sm flex-grow mx-2">
        {selectedStatus ?? "No inputs"}
      </p>
      <CaretUpDown size={20} className="flex-none" />
      {/* Options */}
      {isOpen && (
        <ModalPortal>
          <motion.div
            ref={optionsRef}
            initial={{
              opacity: 0,
              height: 0,
              top: modalPosition?.top + 30,
              left: modalPosition?.left,
            }}
            animate={{
              opacity: isOpen ? 1 : 0,
              height: isOpen ? "auto" : 0,
              top: modalPosition?.top,
              left: modalPosition?.left,
            }}
            className={classNames(
              `fixed z-[999999]`,
              "mt-2 w-fit backdrop-blur-sm rounded-xl",
              "shadow-lg shadow-base-300/30"
            )}
          >
            <div className="overflow-auto flex-grow max-h-96 rounded-b-xl">
              <div className="flex flex-col w-full h-full bg-base-100/70 backdrop-blur-sm">
                {STATUS_OPTIONS?.map(
                  (status: "broken" | "working" | "candidate", index) => {
                    return (
                      <div
                        key={index}
                        className={classNames(
                          "flex flex-row items-center gap-x-2 cursor-pointer text-base-content text-sm",
                          "transition-all hover:bg-white/20 rounded-md py-2 px-4"
                        )}
                        onClick={() => {
                          props.setStatus(status);
                          setIsOpen(false);
                        }}
                      >
                        <StatusIndicator status={status} />
                        <p>{status}</p>
                      </div>
                    );
                  }
                )}
              </div>
            </div>
          </motion.div>
        </ModalPortal>
      )}
    </div>
  );
};
