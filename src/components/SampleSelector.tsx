import { EMPTY_INPUTS_LABEL, useSamples } from "@/hooks/dev/useSample";
import { CaretDown } from "@phosphor-icons/react";
import classNames from "classnames";
import { useEffect, useMemo, useRef, useState } from "react";
import { ModalPortal } from "./ModalPortal";
import { motion } from "framer-motion";

interface SampleSelectorProps {
  sampleName: string;
  setSample: (name: string) => void;
}

export const SampleSelector = (props: SampleSelectorProps) => {
  const { sampleList } = useSamples();
  const [isOpen, setIsOpen] = useState(false);

  const [inputValue, setInputValue] = useState<string>(null);
  const [modalPosition, setModalPosition] = useState({
    top: 0,
    left: 0,
  });
  const selectorRef = useRef(null);
  const optionsRef = useRef(null);
  const isOpenRef = useRef(isOpen); // Create a ref to hold the isOpen state

  const filteredOptions = useMemo(() => {
    if (!sampleList) return [];
    if (!inputValue) return sampleList;
    return sampleList.filter((sample: any) =>
      sample.name?.includes(inputValue?.toLowerCase())
    );
  }, [inputValue, sampleList]);

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

  const selectedSample = useMemo(() => {
    return sampleList?.find((sample) => sample.name === props.sampleName);
  }, [props.sampleName, sampleList]);

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
      <p className="truncate text-sm flex-grow mx-2">
        {selectedSample?.name ?? "No inputs"}
      </p>
      <CaretDown size={20} className="flex-none" />
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
            <input
              type="text"
              placeholder="Search input samples..."
              autoFocus
              className={classNames(
                "input rounded-t-xl rounded-b-none focus:outline-none bg-base-100 w-full text-neutral-content"
              )}
              value={inputValue} // Use value state
              onChange={(e) => {
                setInputValue(e.target.value); // Update the value state
              }}
            />
            <div className="overflow-auto flex-grow max-h-96 rounded-b-xl">
              <div className="flex flex-col w-full h-full bg-base-100/70 backdrop-blur-sm">
                {filteredOptions?.length === 0 && (
                  <div className="flex flex-col items-center justify-center flex-grow py-8">
                    <p className="text-base-content">No samples found.</p>
                  </div>
                )}
                {filteredOptions?.map((sampleOption: any, index) => {
                  return (
                    <div
                      key={index}
                      className={classNames(
                        "flex flex-row items-center gap-x-2 cursor-pointer text-base-content text-sm",
                        "transition-all hover:bg-white/20 rounded-md py-2 px-4"
                      )}
                      onClick={() => {
                        props.setSample(sampleOption.name);
                        setIsOpen(false);
                      }}
                    >
                      <p>{sampleOption.name}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        </ModalPortal>
      )}
    </div>
  );
};
