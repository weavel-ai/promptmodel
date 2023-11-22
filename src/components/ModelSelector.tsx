import classNames from "classnames";
import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { ModalPortal } from "./ModalPortal";
import { CaretDown } from "@phosphor-icons/react";
import { motion } from "framer-motion";
import { ReactSVG } from "react-svg";
import { useWindowWidth } from "@react-hook/window-size";

interface ModelSelectorProps {
  modelName: string;
  setModel: (name: string) => void;
}

type Model = {
  name: string;
  provider: string;
  description?: string;
};

const SUPPORTED_MODELS: Model[] = [
  {
    name: "gpt-3.5-turbo",
    provider: "OpenAI",
  },
  {
    name: "gpt-3.5-turbo-16k",
    provider: "OpenAI",
  },
  {
    name: "gpt-3.5-turbo-16k-0613",
    provider: "OpenAI",
  },
  {
    name: "gpt-4",
    provider: "OpenAI",
  },
  {
    name: "gpt-4-0613",
    provider: "OpenAI",
  },
  {
    name: "claude-instant-1",
    provider: "Anthropic",
  },
  {
    name: "claude-instant-1.2",
    provider: "Anthropic",
  },
  {
    name: "claude-2",
    provider: "Anthropic",
  },
  {
    name: "command",
    provider: "Cohere",
  },
  {
    name: "command-light",
    provider: "Cohere",
  },
  {
    name: "command-medium",
    provider: "Cohere",
  },
  {
    name: "command-medium-beta",
    provider: "Cohere",
  },
  {
    name: "command-xlarge-beta",
    provider: "Cohere",
  },
  {
    name: "command-nightly",
    provider: "Cohere",
  },
  {
    name: "HCX-002",
    provider: "clova-studio",
  },
];

const PROVIDER_LOGO_PATHS: Record<string, string> = {
  OpenAI: "/logos/openai-logo.svg",
  Anthropic: "/logos/anthropic-logo.svg",
  Cohere: "/logos/cohere-logo.svg",
  "clova-studio": "/logos/clova-studio-logo.png",
};

export const ModelDisplay = ({ modelName }) => {
  const model = useMemo(
    () => SUPPORTED_MODELS.find((model) => model.name === modelName),
    [modelName]
  );

  return (
    <div className="p-2 flex flex-row gap-x-2 items-center justify-between bg-base-content/10 rounded-md max-w-[11rem]">
      {PROVIDER_LOGO_PATHS[model?.provider]?.endsWith(".svg") ? (
        <ReactSVG
          src={PROVIDER_LOGO_PATHS[model?.provider]}
          className="text-base-content !w-5 !h-5 flex-shrink-0"
        />
      ) : (
        <Image
          alt="logo"
          src={PROVIDER_LOGO_PATHS[model?.provider]}
          width={20}
          height={20}
        />
      )}
      <p className="truncate text-sm flex-grow">{model?.name}</p>
    </div>
  );
};

export const ModelSelector = (props: ModelSelectorProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const windowWidth = useWindowWidth();
  const [inputValue, setInputValue] = useState<string>();
  const [modalPosition, setModalPosition] = useState({
    top: 0,
    right: 0,
  });
  const selectorRef = useRef(null);
  const optionsRef = useRef(null);
  const isOpenRef = useRef(isOpen); // Create a ref to hold the isOpen state

  const filteredOptions = useMemo(() => {
    if (!inputValue) return SUPPORTED_MODELS;
    return SUPPORTED_MODELS.filter((model: Model) =>
      model.name.includes(inputValue?.toLowerCase())
    );
  }, [inputValue]);

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
          console.log("outside click");
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

  const selectedModel = useMemo(() => {
    return SUPPORTED_MODELS.find((model) => model.name === props.modelName);
  }, [props.modelName]);

  function handleClickOpen() {
    if (!isOpen) {
      const selectorRect = selectorRef.current?.getBoundingClientRect();
      setModalPosition({
        top: selectorRect.top + selectorRect.height,
        right: windowWidth - selectorRect.right,
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
      {PROVIDER_LOGO_PATHS[selectedModel.provider].endsWith(".svg") ? (
        <ReactSVG
          src={PROVIDER_LOGO_PATHS[selectedModel.provider]}
          className="text-base-content !w-5 !h-5 flex-shrink-0"
        />
      ) : (
        <Image
          alt="logo"
          src={PROVIDER_LOGO_PATHS[selectedModel.provider]}
          width={20}
          height={20}
        />
      )}
      <p className="truncate text-sm flex-grow mx-2">{selectedModel.name}</p>
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
              right: modalPosition?.right,
            }}
            animate={{
              opacity: isOpen ? 1 : 0,
              height: isOpen ? "auto" : 0,
              top: modalPosition?.top,
              right: modalPosition?.right,
            }}
            className={classNames(
              `fixed z-[999999]`,
              "mt-2 w-fit backdrop-blur-sm rounded-xl",
              "shadow-lg shadow-base-300/30"
            )}
          >
            <input
              type="text"
              placeholder="Search models..."
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
                {filteredOptions?.length === 0 && (
                  <div className="flex flex-col items-center justify-center flex-grow py-8">
                    <p className="text-base-content">No models found.</p>
                  </div>
                )}
                {filteredOptions?.map((modelOption: Model, index) => {
                  return (
                    <div
                      key={index}
                      className={classNames(
                        "flex flex-row items-center gap-x-2 cursor-pointer text-base-content text-sm",
                        "transition-all hover:bg-white/20 rounded-md p-2"
                      )}
                      onClick={() => {
                        props.setModel(modelOption.name);
                        setIsOpen(false);
                      }}
                    >
                      {PROVIDER_LOGO_PATHS[modelOption.provider].endsWith(
                        ".svg"
                      ) ? (
                        <ReactSVG
                          src={PROVIDER_LOGO_PATHS[modelOption.provider]}
                          className="text-base-content !w-5 !h-5 flex-shrink-0"
                        />
                      ) : (
                        <Image
                          alt="logo"
                          src={PROVIDER_LOGO_PATHS[modelOption.provider]}
                          width={20}
                          height={20}
                        />
                      )}
                      <p>{modelOption.name}</p>
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
