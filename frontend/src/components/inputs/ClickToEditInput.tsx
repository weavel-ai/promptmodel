"use client";
import { Check, PencilSimple } from "@phosphor-icons/react";
import classNames from "classnames";
import { useEffect, useRef, useState } from "react";

interface ClickToEditInputProps {
  value: string;
  setValue: (value: string) => void;
  placeholder?: string;
  textarea?: boolean;
  onBlur?: () => void;
}

export function ClickToEditInput({
  value,
  setValue,
  placeholder,
  textarea,
  onBlur,
}: ClickToEditInputProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isMouseHover, setIsMouseHover] = useState(false);
  const inputRef = useRef(null);
  const isEditingRef = useRef(null);

  useEffect(() => {
    isEditingRef.current = isEditing; // Always keep it updated with the latest state
  }, [isEditing]);

  // Use useEffect to add an event listener to the document
  useEffect(() => {
    function handleOutsideClick(event) {
      if (inputRef.current && !inputRef.current.contains(event.target)) {
        if (isEditingRef.current) {
          setIsEditing(false);
          onBlur?.();
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

  return !isEditing ? (
    <button
      className="flex flex-row gap-x-1 items-center input bg-input w-fit rounded-md"
      onClick={() => setIsEditing(true)}
      onMouseEnter={() => setIsMouseHover(true)}
      onMouseLeave={() => setIsMouseHover(false)}
    >
      <p
        className={classNames(
          "font-normal text-sm",
          value?.length > 0 ? "text-base-content" : "text-muted-content"
        )}
      >
        {value?.length > 0 ? value : placeholder}
      </p>
      {isMouseHover && (
        <div
          className="tooltip tooltip-top tooltip-secondary"
          data-tip="Click to edit"
        >
          <PencilSimple size={20} weight="fill" />
        </div>
      )}
    </button>
  ) : (
    <div
      ref={inputRef}
      className={classNames(
        "flex flex-row gap-x-1 items-center bg-input rounded-md !outline-none",
        textarea ? "textarea w-full" : "input w-fit"
      )}
    >
      {textarea ? (
        <textarea
          className="text-sm textarea bg-transparent w-full !min-w-0 text-start !outline-none"
          placeholder={placeholder}
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
      ) : (
        <input
          className="text-sm input bg-transparent w-fit !min-w-0 text-start !outline-none"
          placeholder={placeholder}
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
      )}
    </div>
  );
}
