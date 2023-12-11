import { useTags } from "@/hooks/useTags";
import { TagsInput } from "react-tag-input-component";
import { AddTagsButton } from "../buttons/AddTagsButton";
import { useEffect, useMemo, useRef, useState } from "react";
import classNames from "classnames";
import { motion } from "framer-motion";
import { Check } from "@phosphor-icons/react";
import { createTag } from "@/apis/tags";
import { useSupabaseClient } from "@/apis/supabase";
import {
  arePrimitiveListsEqual,
  cloneDeep,
  generateRandomPastelColor,
} from "@/utils";
import { useProject } from "@/hooks/useProject";
import { Badge } from "../ui/badge";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import { useFunctionModel } from "@/hooks/useFunctionModel";
import { useChatModel } from "@/hooks/useChatModel";
import { updateChatModelVersionTags } from "@/apis/chat_model_versions";
import { updateFunctionModelVersionTags } from "@/apis/function_model_versions";

interface TagsSelectorProps {
  modelType: "FunctionModel" | "ChatModel";
  versionUuid: string;
  previousTags: string[] | null;
}

export function TagsSelector({
  modelType,
  versionUuid,
  previousTags,
}: TagsSelectorProps) {
  const queryClient = useQueryClient();
  const { supabase } = useSupabaseClient();
  const { tagsListData } = useTags();
  const { projectUuid } = useProject();
  const { functionModelUuid } = useFunctionModel();
  const { chatModelUuid } = useChatModel();
  const [isInputShown, setIsInputShown] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState<string | null>(null);
  const [modalPosition, setModalPosition] = useState({
    top: 0,
    left: 0,
  });
  const [selectedTags, setSelectedTags] = useState<string[]>(
    cloneDeep(previousTags ?? [])
  );
  const selectorRef = useRef(null);
  const optionsRef = useRef(null);
  const isOpenRef = useRef(isOpen); // Create a ref to hold the isOpen state

  useEffect(() => {
    setSelectedTags(cloneDeep(previousTags ?? []));
  }, [previousTags]);

  const filteredOptions = useMemo(() => {
    if (!tagsListData) return [];
    if (!inputValue) return tagsListData;
    return tagsListData?.filter((tag: any) =>
      tag?.name.includes(inputValue?.toLowerCase())
    );
  }, [inputValue, tagsListData]);

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
          setSelectedTags(cloneDeep(previousTags ?? []));
        }
      }
      if (
        selectorRef.current &&
        !selectorRef.current.contains(event.target) &&
        !optionsRef.current?.contains(event.target)
      ) {
        setIsInputShown(false);
      }
    }
    // Attach the click event listener
    document.addEventListener("mousedown", handleOutsideClick);
    // Clean up the listener when the component is unmounted
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [previousTags]);

  function handleClickOpen() {
    if (!isOpen) {
      const selectorRect = selectorRef.current?.getBoundingClientRect();
      setModalPosition({
        top: selectorRect.top + selectorRect.height,
        left: selectorRect.left,
      });
    }
    setIsOpen(true);
  }

  async function handleClickSave() {
    let newTagCreated: boolean = false;
    for (const tag of selectedTags) {
      if (
        tagsListData?.filter((tagOption) => tagOption.name === tag)?.length == 0
      ) {
        // Add tag
        await createTag({
          project_uuid: projectUuid,
          name: tag,
          color: generateRandomPastelColor(),
        });
      }
      newTagCreated = true;
    }
    if (modelType === "FunctionModel") {
      // Update FunctionModel version tags
      await updateFunctionModelVersionTags({
        uuid: versionUuid,
        tags: selectedTags,
      });
    } else if (modelType === "ChatModel") {
      // Update ChatModel version tags
      await updateChatModelVersionTags({
        uuid: versionUuid,
        tags: selectedTags,
      });
    }
    if (newTagCreated) {
      await queryClient.invalidateQueries([
        "tagsListData",
        { projectUuid: projectUuid },
      ]);
    }
    if (modelType === "FunctionModel") {
      await queryClient.invalidateQueries([
        "functionModelVersionData",
        { uuid: versionUuid },
      ]);
      await queryClient.invalidateQueries([
        "functionModelVersionListData",
        { functionModelUuid: functionModelUuid },
      ]);
    } else if (modelType === "ChatModel") {
      await queryClient.invalidateQueries([
        "chatModelVersionData",
        { uuid: versionUuid },
      ]);
      await queryClient.invalidateQueries([
        "chatModelVersionListData",
        { chatModelUuid: chatModelUuid },
      ]);
    }
    setIsInputShown(false);
  }

  if (!isInputShown) {
    if (selectedTags?.length == 0) {
      return <AddTagsButton onClick={() => setIsInputShown(true)} />;
    } else {
      return (
        <div
          className="w-full flex flex-row flex-wrap items-center gap-x-1 gap-y-2 tooltip tooltip-bottom tooltip-secondary cursor-pointer"
          data-tip="Click to edit"
          onClick={() => setIsInputShown(true)}
        >
          {selectedTags?.map((tag) => (
            <Badge
              key={tag}
              className={`text-sm text-base-100`}
              style={{
                backgroundColor: tagsListData?.find(
                  (tagOption) => tagOption.name === tag
                )?.color,
              }}
            >
              {tag}
            </Badge>
          ))}
        </div>
      );
    }
  }

  return (
    <div
      ref={selectorRef}
      className={classNames(
        "flex-shrink flex flex-row justify-between items-center px-2 rounded-md bg-base-content/10 text-base-content cursor-pointer relative",
        "transition-all hover:bg-base-content/20 text-sm w-min min-w-[160px]"
      )}
      onClick={handleClickOpen}
      onChange={(e) => {
        const target = e.target as HTMLInputElement;
        if (target.className.includes("tagsinput-input")) {
          setInputValue(target.value);
        }
      }}
    >
      <TagsInput
        name="tags"
        classNames={{
          input: "tagsinput-input text-sm m-0 bg-transparent flex-grow",
          tag: "!bg-secondary text-secondary-content text-sm w-min",
        }}
        placeHolder="Type and press enter"
        value={selectedTags}
        onChange={setSelectedTags}
      />
      <button
        onClick={handleClickSave}
        className="transition-all p-2 rounded-full hover:bg-base-content/20 text-green-500 disabled:text-muted-content tooltip tooltip-bottom tooltip-success"
        data-tip="Click to save"
        disabled={arePrimitiveListsEqual(selectedTags, previousTags ?? [])}
      >
        <Check weight="bold" size={20} />
      </button>
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
                  <p className="text-base-content">+ {inputValue}</p>
                </div>
              )}
              {filteredOptions?.map((tagOption: any, index) => {
                return (
                  <div
                    key={index}
                    ref={optionsRef}
                    className={classNames(
                      "flex flex-row items-center gap-x-2 cursor-pointer text-base-content text-sm",
                      "transition-all hover:bg-white/20 rounded-lg py-2 px-4"
                    )}
                    onClick={() => {
                      if (selectedTags?.includes(tagOption.name)) {
                        setSelectedTags(
                          selectedTags?.filter((tag) => tag !== tagOption.name)
                        );
                        return;
                      }
                      setSelectedTags([...selectedTags, tagOption.name]);
                    }}
                  >
                    <input
                      type="checkbox"
                      readOnly
                      checked={selectedTags?.includes(tagOption.name)}
                      className={classNames("checkbox border-base-content")}
                      style={{
                        backgroundColor: selectedTags?.includes(tagOption.name)
                          ? "bg-base-content/20"
                          : "transparent",
                      }}
                    />
                    <Badge
                      className={`text-sm text-base-100`}
                      style={{
                        backgroundColor: tagOption.color,
                      }}
                    >
                      {tagOption.name}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
