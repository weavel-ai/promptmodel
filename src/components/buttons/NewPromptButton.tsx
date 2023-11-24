import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { PlusSquare } from "@phosphor-icons/react";
import classNames from "classnames";

export function NewPromptButton({ prompts, setPrompts }) {
  const buttonRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);

  const isEmpty = !(prompts?.length > 0);

  // Use useEffect to add an event listener to the document
  useEffect(() => {
    function handleOutsideClick(event) {
      if (buttonRef.current && !buttonRef.current.contains(event.target)) {
        setIsOpen(false);
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
    <motion.button
      ref={buttonRef}
      className="relative group"
      onClick={() => {
        setIsOpen(true);
      }}
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      <PlusSquare
        size={36}
        weight="fill"
        className="text-base-content hover:text-base-content/80 hover:scale-110 active:scale-95 transition-all m-1"
      />
      {isOpen && (
        <motion.div
          initial={{
            opacity: 0,
            width: 0,
            bottom: !isEmpty ? -10 : "auto",
            top: isEmpty ? -5 : "auto",
            left: 0,
          }}
          animate={{
            opacity: isOpen ? 1 : 0,
            width: isOpen ? "auto" : 0,
            left: "100%",
            bottom: !isEmpty ? 0 : "auto",
            top: isEmpty ? 5 : "auto",
          }}
          className={classNames(
            `absolute z-[99999]`,
            "w-fit bg-base-content/10 backdrop-blur-sm rounded-lg",
            "shadow-md shadow-base-content/10",
            "btn-group btn-group-vertical"
          )}
        >
          {["system", "user", "assistant"].map((role: string) => (
            <button
              className="text-sm text-start hover:bg-base-content hover:text-base-100 rounded-lg px-3 py-2"
              onClick={() =>
                setPrompts((prevPrompts) => {
                  const newPrompts = [...prevPrompts];
                  newPrompts.push({
                    role: role,
                    step: newPrompts.length + 1,
                    content: "",
                  });
                  return newPrompts;
                })
              }
            >
              {role.charAt(0).toUpperCase() + role.slice(1)}
            </button>
          ))}
        </motion.div>
      )}
    </motion.button>
  );
}
