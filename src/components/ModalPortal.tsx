"use client";

import { useModalStore } from "@/stores/modalStore";
import classNames from "classnames";
import { useEffect, useState } from "react";
import ReactDOM from "react-dom";

export const ModalPortal = ({ children }) => {
  // Create a state to hold the div element
  const [el] = useState(() => document.createElement("div"));

  useEffect(() => {
    // Get the modal root
    const modalRoot = document.getElementById("modal-root");
    if (!modalRoot) {
      console.error("Modal root element not found");
      return;
    }

    // Append the element into the DOM on mount
    modalRoot.appendChild(el);

    // Remove the element from the DOM when we unmount
    return () => {
      modalRoot.removeChild(el);
    };
  }, [el]);

  return ReactDOM.createPortal(children, el);
};

export const ModalRoot = () => {
  const { backdropOpen, setBackdropOpen } = useModalStore();

  return (
    <div
      id="modal-root"
      className={classNames(
        backdropOpen && "fixed w-full h-full !z-[1000] inset-0"
      )}
      onClick={() => {
        setBackdropOpen(false);
      }}
    />
  );
};
