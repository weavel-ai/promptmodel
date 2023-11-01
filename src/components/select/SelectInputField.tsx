"use client";

import classNames from "classnames";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";

export const SelectInputField = ({
  value,
  setValue,
  options,
}: {
  value: string;
  setValue: (value: string) => void;
  options?: string[];
}) => {
  const [showOptions, setShowOptions] = useState<boolean>(false);
  const [inputValue, setInputValue] = useState<string>(value);
  const [focusedOption, setFocusedOption] = useState<number>(0);

  const inputRef = useRef(null);
  const optionsRef = useRef(null);
  const showOptionsRef = useRef(showOptions); // Create a ref to hold the showOptions state

  const optionsPosition = useMemo(() => {
    if (!inputRef.current) return {};
    const inputRect = inputRef.current.getBoundingClientRect();
    return {
      top: inputRect.top + inputRect.height,
      left: inputRect.left,
    };
  }, [inputRef.current]);

  const filteredOptions = useMemo(() => {
    return options
      ? Object.values(options).filter((option: string) =>
          option.toLowerCase().includes(inputValue.toLowerCase())
        )
      : [];
  }, [inputValue, options]);

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
      <input
        type="text"
        className={classNames(
          "input bg-base-100 active:outline-none focus:outline-none focus-border-none"
        )}
        value={options?.length > 0 ? inputValue : value} // Use value state
        onKeyDown={(e) => {
          if (e.key == "ArrowDown") {
            if (showOptions) {
              if (focusedOption < filteredOptions.length - 1) {
                setFocusedOption((prevFocusedOption) => prevFocusedOption + 1);
              }
            } else {
              setShowOptions(true);
            }
          } else if (e.key == "ArrowUp") {
            if (showOptions) {
              if (focusedOption > 0) {
                setFocusedOption((prevFocusedOption) => prevFocusedOption - 1);
              }
            } else {
              setShowOptions(true);
            }
          } else if (e.key == "Enter") {
            if (showOptions) {
              setValue(filteredOptions[focusedOption]);
              setInputValue(filteredOptions[focusedOption]);
              setShowOptions(false);
              e.stopPropagation();
            }
          } else if (e.key == "Escape") {
            setShowOptions(false);
          }
        }}
        onChange={(e) => {
          if (options?.length > 0) {
            setInputValue(e.target.value); // Update the value state
            if (options) {
              setShowOptions(true);
            }
          } else {
            setValue(e.target.value);
          }
        }}
        onFocus={() => {
          if (options) {
            setShowOptions(true);
            setInputValue("");
          }
        }}
        onBlur={(e) => {
          if (e.target !== e.currentTarget && options) {
            setShowOptions(false);
          }
          if (!options.includes(inputValue)) {
            setInputValue("");
          }
          if (options.includes(inputValue)) {
            setValue(inputValue);
          }
        }}
      />
      {/* Options */}
      {options?.length > 0 && (
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
            "mt-2 w-fit min-w-[200px] bg-base-300/80 backdrop-blur-sm rounded-2xl p-2 z-[100]",
            "shadow-lg shadow-black/30",
            "max-h-96 overflow-auto"
          )}
        >
          <div className="flex flex-col h-full">
            {filteredOptions?.length === 0 && (
              <p className="py-2 text-base-content">Invalid type</p>
            )}
            {filteredOptions?.map((optionValue: string, index) => {
              return (
                <div
                  key={index}
                  className={classNames(
                    "flex flex-row items-center gap-x-2 cursor-pointer",
                    "transition-all hover:bg-white/20 rounded-md p-2",
                    focusedOption === index && "bg-white/20"
                  )}
                  onClick={() => {
                    setValue(optionValue);
                    setInputValue(optionValue);
                    setShowOptions(false);
                  }}
                >
                  <p className="text-sm text-base-content">{optionValue}</p>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}
    </div>
  );
};
