import { EMPTY_INPUTS_LABEL, useSamples } from "@/hooks/dev/useSample";
import { CaretDown, Plus } from "@phosphor-icons/react";
import classNames from "classnames";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { ModalPortal } from "./ModalPortal";
import { motion } from "framer-motion";
import { useDevBranch } from "@/hooks/useDevBranch";
import { CreateSampleInputModal } from "./modals/CreateSampleInputsModal";
import ReactJson from "react-json-view";

interface SampleSelectorProps {
  sampleName: string;
  setSample: (name: string) => void;
}

export const SampleSelector = (props: SampleSelectorProps) => {
  const { sampleList, refetchSampleList } = useSamples();
  const { isCloudDev } = useDevBranch();
  const [isOpen, setIsOpen] = useState(false);
  const [showCreateSampleInputsModal, setShowCreateSampleInputsModal] =
    useState(false);

  const [inputValue, setInputValue] = useState<string | null>(null);
  const [modalPosition, setModalPosition] = useState({
    top: 0,
    left: 0,
  });
  const [hoveredSample, setHoveredSample] = useState(null);
  const selectorRef = useRef(null);
  const optionsRef = useRef(null);
  const sampleInfoRef = useRef(null);
  const isOpenRef = useRef(isOpen);

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
        !selectorRef.current.contains(event.target) &&
        !sampleInfoRef.current?.contains(event.target)
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

  const hoveredSampleContent = useMemo(() => {
    if (!hoveredSample) return null;
    const content = hoveredSample?.content || hoveredSample?.contents;
    // If hoveredSample.content is Record<string, any>, return it
    if (typeof hoveredSample?.contents === "object")
      return hoveredSample?.contents;
    else {
      try {
        return JSON.parse(hoveredSample?.content);
      } catch (err) {
        return null;
      }
    }
  }, [hoveredSample]);

  function handleClickOpen(event) {
    // if (createSampleModalRef.current.contains(event.target)) return;
    if (!isOpen) {
      const selectorRect = selectorRef.current?.getBoundingClientRect();
      setModalPosition({
        top: selectorRect.top + selectorRect.height,
        left: selectorRect.left,
      });
    }
    setIsOpen(!isOpen);
  }

  async function handleNewSampleCreated(name: string) {
    await refetchSampleList();
    props.setSample(name);
    setIsOpen(false);
  }

  return (
    <>
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
                "mt-2 mb-4 pb-4 w-fit backdrop-blur-sm",
                "shadow-lg shadow-base-300/30"
              )}
            >
              <div className="flex flex-col relative">
                <input
                  type="text"
                  placeholder="Search input samples..."
                  autoFocus
                  className={classNames(
                    "input text-sm rounded-t-xl rounded-b-none focus:outline-none bg-base-100 w-full text-neutral-content"
                  )}
                  value={inputValue} // Use value state
                  onChange={(e) => {
                    setInputValue(e.target.value); // Update the value state
                  }}
                />
                <div className="overflow-auto flex-grow max-h-96 rounded-b-xl">
                  <div className="flex flex-col w-full h-full bg-base-100/70 backdrop-blur-sm rounded-b-xl">
                    {filteredOptions?.length == 0 && (
                      <div className="flex flex-col items-center justify-center flex-grow py-8">
                        <p className="text-base-content">No samples found.</p>
                      </div>
                    )}
                    {filteredOptions?.map((sampleOption: any, index) => {
                      return (
                        <div
                          key={index}
                          className={classNames(
                            "flex flex-row items-center gap-x-2 cursor-pointer text-base-content text-sm group relative",
                            "transition-all hover:bg-base-content/20 rounded-md py-2 px-4"
                          )}
                          onMouseOver={() => {
                            if (sampleOption.name === EMPTY_INPUTS_LABEL)
                              return;
                            setHoveredSample(sampleOption);
                          }}
                          onMouseOut={(e) => {
                            // Check if the mouse is moving to sampleInfoRef
                            if (
                              sampleInfoRef.current?.contains(e.relatedTarget)
                            ) {
                              // Don't hide the parent element if the mouse is moving to sampleInfoRef
                              return;
                            }
                            // Hide the parent element in other cases
                            setHoveredSample(null);
                          }}
                          onClick={() => {
                            props.setSample(sampleOption.name);
                            setIsOpen(false);
                          }}
                        >
                          <p>{sampleOption.name}</p>
                        </div>
                      );
                    })}
                    {isCloudDev && (
                      <button
                        className="flex flex-row w-full justify-start gap-x-2 hover:bg-base-content/20 rounded-xl px-4 py-2 transition-colors text-secondary font-medium items-center"
                        onClick={() => setShowCreateSampleInputsModal(true)}
                      >
                        <Plus size={20} weight="bold" />
                        <p>Add sample inputs</p>
                      </button>
                    )}
                  </div>
                </div>
                <motion.div
                  ref={sampleInfoRef}
                  initial={{
                    opacity: 0,
                    right: 0,
                  }}
                  animate={{
                    opacity: hoveredSample ? 1 : 0,
                    right: "100%",
                  }}
                  className={classNames("absolute bg-transparent w-fit pr-2")}
                >
                  {hoveredSample && (
                    <div className="relative bg-popover/60 backdrop-blur-sm rounded-md pt-0 p-4 flex flex-col gap-y-2 items-start justify-start max-h-[60vh] overflow-auto">
                      <div className="sticky top-0 py-2 bg-popover/50 backdrop-blur-sm w-full rounded-md z-50">
                        <p className="text-popover-content">
                          {hoveredSample?.name}
                        </p>
                      </div>
                      {hoveredSampleContent && (
                        <ReactJson
                          src={hoveredSampleContent}
                          theme="monokai"
                          name={false}
                          displayDataTypes={false}
                          displayObjectSize={false}
                          style={{
                            backgroundColor: "var(--base-100)",
                          }}
                        />
                      )}
                    </div>
                  )}
                </motion.div>
              </div>
            </motion.div>
          </ModalPortal>
        )}
      </div>
      <CreateSampleInputModal
        isOpen={showCreateSampleInputsModal}
        setIsOpen={setShowCreateSampleInputsModal}
        onCreated={handleNewSampleCreated}
      />
    </>
  );
};
