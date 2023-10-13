"use client";

import { useModalStore } from "@/stores/modalStore";
import classNames from "classnames";
import ReactDOM from "react-dom";

export const ModalPortal = ({ children }) => {
  const modalRoot = document.getElementById("modal-root");

  return ReactDOM.createPortal(children, modalRoot);
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
