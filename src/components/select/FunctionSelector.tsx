import { CaretDown } from "@phosphor-icons/react";
import classNames from "classnames";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { ModalPortal } from "@/components/ModalPortal";
import { motion } from "framer-motion";
import { TagsInput } from "react-tag-input-component";
import { useFunctions } from "@/hooks/useFunction";
import { OnlineStatus } from "../OnlineStatus";

interface FunctionSelectorProps {
  selectedFunctions: string[];
  setSelectedFunctions: (functions: string[]) => void;
}

export const FunctionSelector = ({
  selectedFunctions,
  setSelectedFunctions,
}: FunctionSelectorProps) => {
  const { functionListData } = useFunctions();
  const [isOpen, setIsOpen] = useState(false);

  const [inputValue, setInputValue] = useState<string | null>(null);
  const [modalPosition, setModalPosition] = useState({
    top: 0,
    left: 0,
  });
  const selectorRef = useRef(null);
  const optionsRef = useRef(null);
  const isOpenRef = useRef(isOpen); // Create a ref to hold the isOpen state

  const filteredOptions = useMemo(() => {
    if (!functionListData) return [];
    if (!inputValue)
      return functionListData?.filter(
        (func: any) => !selectedFunctions?.includes(func.name)
      );
    return functionListData?.filter(
      (func: any) =>
        func?.includes(inputValue?.toLowerCase()) &&
        !selectedFunctions?.includes(func.name)
    );
  }, [inputValue, functionListData, selectedFunctions]);

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
        "flex flex-row justify-between items-center p-2 rounded-md bg-base-content/10 text-base-content cursor-pointer relative",
        "transition-all hover:bg-base-content/20 text-sm min-w-[200px]"
      )}
      onClick={handleClickOpen}
      // className="w-full bg-base-content/10 rounded-lg text-sm"
      onChange={(e) => {
        const target = e.target as HTMLInputElement;
        if (target.className.includes("tagsinput-input")) {
          setInputValue(target.value);
        }
      }}
    >
      <TagsInput
        value={selectedFunctions}
        name="Functions"
        classNames={{
          input:
            "tagsinput-input text-sm m-0 flex-grow bg-transparent disabled",
          tag: "!bg-primary text-primary-content text-sm",
        }}
        placeHolder="Search functions..."
        beforeAddValidate={(tag) => {
          return !selectedFunctions.includes(tag);
        }}
        onChange={setSelectedFunctions}
      />
      {/* Options */}
      {isOpen && (
        <motion.div
          ref={optionsRef}
          initial={{
            opacity: 0,
            height: 0,
            // top: modalPosition?.top + 30,
            // left: modalPosition?.left,
            top: "50%",
            left: 0,
          }}
          animate={{
            opacity: isOpen ? 1 : 0,
            height: isOpen ? "auto" : 0,
            top: "105%",
            left: 0,
            // top: modalPosition?.top,
            // left: modalPosition?.left,
          }}
          className={classNames(
            `absolute z-[999999]`,
            "w-fit backdrop-blur-sm rounded-lg",
            "shadow-lg shadow-base-300/30 min-w-[200px]"
          )}
        >
          <div className="overflow-auto flex-grow max-h-96">
            <div className="flex flex-col w-full h-full bg-base-100/70 backdrop-blur-sm rounded-b-lg">
              {filteredOptions?.length === 0 && (
                <div className="flex flex-col items-center justify-center flex-grow py-4">
                  <p className="text-base-content">No functions found.</p>
                </div>
              )}
              {filteredOptions?.map((functionOption: any, index) => {
                return (
                  <div
                    key={index}
                    className={classNames(
                      "flex flex-row items-center gap-x-2 cursor-pointer text-base-content text-sm",
                      "transition-all hover:bg-white/20 rounded-lg py-2 px-4"
                    )}
                    onClick={() => {
                      if (selectedFunctions?.includes(functionOption.name))
                        return;
                      setSelectedFunctions([
                        ...selectedFunctions,
                        functionOption.name,
                      ]);
                      setIsOpen(false);
                    }}
                  >
                    <OnlineStatus online={functionOption.online} mini />
                    <p>{functionOption.name}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};
