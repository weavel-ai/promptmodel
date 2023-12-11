import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import classNames from "classnames";
import { ModalPortal } from "../ModalPortal";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { coldarkDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { SelectInputField } from "./SelectInputField";
import { Command, KeyReturn } from "@phosphor-icons/react";
import { toast } from "react-toastify";
import { useHotkeys } from "react-hotkeys-hook";
import { ParsingType } from "@/types/ParsingType";

const TYPES: string[] = ["str", "int", "float", "bool", "List", "Dict"];

export const SlashCommandOptions = ({
  open,
  setOpen,
  parsingType,
  onInsert,
}: {
  open: boolean;
  setOpen: (open: boolean) => void;
  parsingType: ParsingType;
  onInsert: (insertValue: string, outputKey: string) => void;
}) => {
  const [outputKey, setOutputKey] = useState("");
  const [type, setType] = useState("");

  useEffect(() => {
    if (open) {
      if (!parsingType) {
        toast("Please select a parsing type to insert an output format.");
        setOpen(false);
      }
      setOutputKey("");
      setType("");
    }
  }, [open, parsingType, setOpen, setOutputKey, setType]);

  const outputFormatText = useMemo(() => {
    let valuePlaceholder: string = "(value here)";
    if (type == "List") {
      valuePlaceholder = "(list in jsonl format)";
    } else if (type == "Dict") {
      valuePlaceholder = "(value in json format)";
    }
    if (parsingType === ParsingType.COLON) {
      return `${outputKey}:\n${valuePlaceholder}`;
    } else if (parsingType == ParsingType.SQUARE_BRACKET) {
      return `[${outputKey} type=${type}]\n${valuePlaceholder}\n[/${outputKey}]`;
    } else if (parsingType == ParsingType.DOUBLE_SQUARE_BRACKET) {
      return `[[${outputKey} type=${type}]]\n${valuePlaceholder}\n[[/${outputKey}]]`;
    } else if (parsingType == ParsingType.HTML) {
      return `<${outputKey} type=${type}>\n${valuePlaceholder}\n</${outputKey}>`;
    }
  }, [outputKey, type, parsingType]);

  useHotkeys(
    "mod+enter",
    () => {
      if (open && outputKey && type) {
        onInsert(outputFormatText, outputKey);
        setOpen(false);
      }
    },
    {
      enableOnFormTags: true,
    }
  );

  useHotkeys(
    "esc",
    () => {
      if (open) {
        setOpen(false);
      }
    },
    {
      enableOnFormTags: true,
    }
  );

  function handleClickInsert() {
    if (open && outputKey && type) {
      onInsert(outputFormatText, outputKey);
      setOpen(false);
    }
  }

  if (!open) return null;

  return (
    <ModalPortal>
      <div className="w-full h-full flex justify-center items-center fixed inset-0 z-[99999]">
        <motion.div
          className={classNames(
            "w-fit min-h-fit bg-popover/80 backdrop-blur-sm rounded-box shadow-lg flex flex-col p-4 pt-2"
          )}
          initial={{
            opacity: 0,
          }}
          animate={{
            opacity: open ? 1 : 0,
            height: open ? "auto" : 0,
          }}
        >
          <div className="flex flex-row gap-x-2 justify-between items-center">
            <div className="flex flex-col items-start">
              <div className="label">
                <p className="label-text">Output key</p>
              </div>
              <input
                autoFocus
                className="input bg-base-100 active:outline-none focus:outline-none focus-border-none"
                value={outputKey}
                onChange={(e) => setOutputKey(e.target.value)}
              />
            </div>
            <div className="flex flex-col items-start">
              <div className="label">
                <p className="label-text">Type</p>
              </div>
              <SelectInputField
                value={type}
                setValue={setType}
                options={TYPES}
              />
            </div>
          </div>
          <div className="divider after:bg-muted before:bg-muted px-2 mt-0" />
          <p className="text-popover-content">
            The output format prompt below will be inserted.
          </p>
          <SyntaxHighlighter language="python" style={coldarkDark}>
            {outputFormatText}
          </SyntaxHighlighter>
          <div className="flex flex-row justify-end items-center gap-x-2">
            <button
              className="btn bg-muted hover:bg-muted/80 text-muted-content mt-2"
              onClick={() => setOpen(false)}
            >
              <p>Cancel</p>
              <div className="flex flex-row items-center">
                <kbd className="kbd text-base-content">esc</kbd>
              </div>
            </button>
            <button
              className="btn bg-base-content hover:bg-base-content/80 text-base-100 mt-2"
              onClick={handleClickInsert}
            >
              <p>Insert</p>
              <div className="flex flex-row items-center">
                <kbd className="kbd text-base-content">
                  <Command size={16} />
                </kbd>
                <KeyReturn size={36} weight="fill" />
              </div>
            </button>
          </div>
        </motion.div>
      </div>
    </ModalPortal>
  );
};
