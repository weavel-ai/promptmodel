import { CaretUpDown } from "@phosphor-icons/react";
import classNames from "classnames";
import Link from "next/link";
import { useParams } from "next/navigation";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ModalPortal } from "./ModalPortal";
import { LocalConnectionStatus } from "./LocalConnectionStatus";

type LinkDisplay = {
  label: string;
  href: string;
  online?: boolean;
};

interface SelectNavigatorProps {
  current: LinkDisplay;
  statusType: "connection" | "usage";
  options?: LinkDisplay[];
}

export const SelectNavigator = ({
  current,
  statusType,
  options,
}: SelectNavigatorProps) => {
  const [optionsPosition, setOptionsPosition] = useState(null);
  const containerRef = useRef<HTMLAnchorElement | null>(null);
  const optionsRef = useRef<HTMLDivElement | null>(null);
  const optionsPositionRef = useRef(optionsPosition); // Create a ref to hold the optionsPosition state

  useEffect(() => {
    optionsPositionRef.current = optionsPosition; // Always keep it updated with the latest state
  }, [optionsPosition]);

  // Use useEffect to add an event listener to the document
  useEffect(() => {
    function handleOutsideClick(event) {
      if (optionsRef.current && !optionsRef.current.contains(event.target)) {
        if (optionsPositionRef.current) {
          setOptionsPosition(null);
        } else {
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
    <div>
      <div className="flex flex-row items-center gap-x-1 cursor-pointer">
        <Link
          ref={containerRef}
          href={current?.href}
          className={classNames(
            "w-full h-full rounded-md px-2 py-1 transition-colors hover:bg-base-content/10 flex flex-row items-center gap-x-2"
          )}
        >
          <LocalConnectionStatus
            online={current.online}
            statusType={statusType}
            mini
          />
          <p className="text-sm">{current.label}</p>
        </Link>
        <button
          onClick={() => {
            const inputRect = containerRef.current.getBoundingClientRect();
            setOptionsPosition({
              top: inputRect.top + inputRect.height,
              left: inputRect.left,
            });
          }}
          className="text-muted-content hover:bg-base-content/20 transition-colors rounded-md py-1"
        >
          <CaretUpDown weight="bold" size={20} />
        </button>
      </div>
      {/* Options */}
      {options && options?.length > 0 && optionsPosition && (
        <ModalPortal>
          <motion.div
            ref={optionsRef}
            initial={{
              opacity: 0,
              height: 0,
              top: optionsPosition?.top - 16,
              left: optionsPosition?.left,
            }}
            animate={{
              opacity: optionsPosition ? 1 : 0,
              height: optionsPosition ? "auto" : 0,
              top: optionsPosition?.top + 4,
              left: optionsPosition?.left,
            }}
            className={classNames(
              `fixed z-[99999]`,
              "mt-2 w-fit bg-popover/70 text-popover-content backdrop-blur-sm rounded-2xl p-2",
              "shadow-lg shadow-popover/30",
              "max-h-96 overflow-auto"
            )}
          >
            <div className="flex flex-col h-full">
              {options?.map((optionValue: LinkDisplay, index) => {
                return (
                  <Link
                    key={index}
                    href={optionValue.href}
                    onClick={() => setOptionsPosition(null)}
                    className={classNames(
                      "flex flex-row items-center gap-x-2 cursor-pointer",
                      "transition-all hover:bg-popover-content/20 rounded-md p-2"
                    )}
                  >
                    <LocalConnectionStatus
                      online={optionValue.online}
                      statusType={statusType}
                      mini
                    />
                    <p className="text-sm text-popover-content">
                      {optionValue.label}
                    </p>
                  </Link>
                );
              })}
            </div>
          </motion.div>
        </ModalPortal>
      )}
    </div>
  );
};
