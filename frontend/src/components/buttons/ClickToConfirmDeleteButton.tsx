import { TrashSimple } from "@phosphor-icons/react";
import classNames from "classnames";
import { useEffect, useRef, useState } from "react";
import { cva, type VariantProps } from "class-variance-authority";

interface ClickToConfirmDeleteButtonProps {
  label?: string;
  handleDelete: () => void;
}

const initialButtonVariants = cva(
  "transition-all btn btn-sm group flex flex-row gap-x-2 items-center",
  {
    variants: {
      variant: {
        neutral: "btn-neutral text-base-content",
        colored: "bg-red-500 text-base-content hover:bg-red-500",
      },
    },
    defaultVariants: {
      variant: "neutral",
    },
  }
);

const confirmButtonVariants = cva(
  "transition-all btn btn-sm text-base-content group flex flex-row gap-x-2 items-center",
  {
    variants: {
      variant: {
        neutral: "btn-neutral text-red-500",
        colored: "bg-red-500 text-base-content hover:bg-red-500",
      },
    },
    defaultVariants: {
      variant: "neutral",
    },
  }
);

export function ClickToConfirmDeleteButton({
  label,
  handleDelete,
  variant,
}: ClickToConfirmDeleteButtonProps &
  VariantProps<typeof initialButtonVariants>) {
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const confirmDeleteRef = useRef(null);

  function handleClickOutside(event: any) {
    if (
      confirmDeleteRef.current &&
      !confirmDeleteRef.current.contains(event.target)
    ) {
      setIsConfirmDeleteOpen(false);
    }
  }

  useEffect(() => {
    // Catch click outside of confirm delete button
    if (isConfirmDeleteOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isConfirmDeleteOpen]);

  return isConfirmDeleteOpen ? (
    <button
      ref={confirmDeleteRef}
      className={classNames(confirmButtonVariants({ variant }))}
      onClick={() => {
        handleDelete();
        setIsConfirmDeleteOpen(false);
      }}
    >
      <TrashSimple size={16} weight="fill" className="transition-colors" />
      <p>really delete?</p>
    </button>
  ) : (
    <button
      className={classNames(
        initialButtonVariants({ variant }),
        label ? " " : "btn-square"
      )}
      onClick={() => setIsConfirmDeleteOpen(true)}
    >
      <TrashSimple size={16} weight="fill" className="transition-colors" />
      {label && <p className="transition-colors">{label}</p>}
    </button>
  );
}
