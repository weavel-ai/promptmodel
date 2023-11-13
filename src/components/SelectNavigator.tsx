import { CaretUpDown } from "@phosphor-icons/react";
import classNames from "classnames";
import Link from "next/link";
import { useParams } from "next/navigation";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ModalPortal } from "./ModalPortal";

type LinkDisplay = {
  label: string;
  href: string;
};

interface SelectNavigatorProps {
  current: LinkDisplay;
  options?: LinkDisplay[];
}

export const SelectNavigator = ({ current, options }: SelectNavigatorProps) => {
  const [showOptions, setShowOptions] = useState<boolean>(false);
  const params = useParams();
  const containerRef = useRef<HTMLAnchorElement | null>(null);
  const optionsRef = useRef<HTMLDivElement | null>(null);
  const showOptionsRef = useRef(showOptions); // Create a ref to hold the showOptions state

  const optionsPosition = useMemo(() => {
    if (!containerRef.current) return {};
    const inputRect = containerRef.current.getBoundingClientRect();
    return {
      top: inputRect.top + inputRect.height,
      left: inputRect.left,
    };
  }, [containerRef.current]);

  useEffect(() => {
    showOptionsRef.current = showOptions; // Always keep it updated with the latest state
  }, [showOptions]);

  // Use useEffect to add an event listener to the document
  useEffect(() => {
    function handleOutsideClick(event) {
      if (optionsRef.current && !optionsRef.current.contains(event.target)) {
        if (showOptionsRef.current) {
          setShowOptions(false);
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
      <div className="flex flex-row items-center gap-x-2 cursor-pointer">
        <Link
          ref={containerRef}
          href={current?.href}
          className={classNames("bg-base-100")}
        >
          {current.label}
        </Link>
        <button
          onClick={() => {
            setShowOptions(!showOptions);
          }}
        >
          <CaretUpDown weight="bold" size={20} className="text-muted-content" />
        </button>
      </div>
      {/* Options */}
      {options && options?.length > 0 && showOptions && optionsPosition?.top && (
        <ModalPortal>
          <motion.div
            ref={optionsRef}
            initial={{
              opacity: 0,
              height: 0,
              top: optionsPosition?.top + 16,
              left: optionsPosition?.left,
            }}
            animate={{
              opacity: showOptions ? 1 : 0,
              height: showOptions ? "auto" : 0,
              top: optionsPosition?.top + 4,
              left: optionsPosition?.left,
            }}
            className={classNames(
              `fixed z-[99999]`,
              "mt-2 w-fit bg-popover/50 text-popover-content backdrop-blur-sm rounded-2xl p-2",
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
                    onClick={() => setShowOptions(false)}
                    className={classNames(
                      "flex flex-row items-center gap-x-2 cursor-pointer",
                      "transition-all hover:bg-popover-content/20 rounded-md p-2"
                    )}
                  >
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
