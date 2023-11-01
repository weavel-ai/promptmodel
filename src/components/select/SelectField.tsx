"use client";

import classNames from "classnames";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ModalPortal } from "../ModalPortal";

interface SelectFieldProps {
  value: string;
  setValue: (value: string) => void;
  options?: string[];
}

export const SelectField = ({ value, setValue, options }: SelectFieldProps) => {
  const [showOptions, setShowOptions] = useState<boolean>(false);

  const inputRef = useRef<HTMLInputElement | null>(null);
  const optionsRef = useRef<HTMLDivElement | null>(null);
  const showOptionsRef = useRef(showOptions); // Create a ref to hold the showOptions state

  const optionsPosition = useMemo(() => {
    if (!inputRef.current) return {};
    const inputRect = inputRef.current.getBoundingClientRect();
    return {
      top: inputRect.top + inputRect.height,
      left: inputRect.left,
    };
  }, [inputRef.current]);

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
    <div className="relative overflow-visible">
      <p
        className={classNames(
          "input-bordered bg-[#111] input input-sm text-white"
        )}
        onClick={() => {
          if (options) {
            setShowOptions(true);
          }
        }}
        onBlur={(e) => {
          if (e.target !== e.currentTarget && options) {
            setShowOptions(false);
          }
        }}
      >
        {value}
      </p>
      {/* Options */}
      {options && options?.length > 0 && (
        <ModalPortal>
          <motion.div
            ref={optionsRef}
            initial={{
              opacity: 0,
              height: 0,
            }}
            animate={{
              opacity: showOptions ? 1 : 0,
              height: showOptions ? "auto" : 0,
            }}
            className={classNames(
              `fixed top-[${optionsPosition?.top}px] left-[${optionsPosition?.left}px]`,
              "mt-2 w-fit bg-[#111]/70 backdrop-blur-sm rounded-2xl p-2",
              "shadow-lg shadow-black/30",
              "max-h-96 overflow-auto"
            )}
          >
            <div className="flex flex-col h-full">
              {options?.map((optionValue: string, index) => {
                return (
                  <div
                    key={index}
                    className={classNames(
                      "flex flex-row items-center gap-x-2 cursor-pointer",
                      "transition-all hover:bg-white/20 rounded-md p-2"
                    )}
                    onClick={() => {
                      setValue(optionValue);
                      setShowOptions(false);
                    }}
                  >
                    <p className="text-sm text-white">{optionValue}</p>
                  </div>
                );
              })}
            </div>
          </motion.div>
        </ModalPortal>
      )}
    </div>
  );
};
