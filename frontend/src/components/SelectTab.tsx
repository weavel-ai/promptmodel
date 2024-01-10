import React, { useCallback, useEffect, useRef, useState } from "react";
import classNames from "classnames";
import { motion } from "framer-motion";
import { cva } from "class-variance-authority";

interface SelectTabProps {
  tabs: string[];
  selectedTab: string;
  onSelect: (tab: string) => void;
  variant?: "rounded" | "underline";
  selectorZIndex?: number;
}

const containerVariants = cva(
  "w-fit p-px h-8 flex flex-row items-center relative",
  {
    variants: {
      variant: {
        rounded: "bg-secondary/20 backdrop-blur-sm rounded-full shadow-lg",
        underline: "bg-transparent",
      },
    },
    defaultVariants: {
      variant: "rounded",
    },
  }
);

const tabVariants = cva(
  "min-w-fit w-full h-full px-3 flex justify-center items-center cursor-pointer transition-colors bg-transparent z-0",
  {
    variants: {
      variant: {
        rounded: "rounded-full",
        underline: "rounded-none",
      },
    },
    defaultVariants: {
      variant: "rounded",
    },
  }
);

const selectorVariants = cva(
  "rounded-full absolute left-0 bg-base-content/90",
  {
    variants: {
      variant: {
        rounded: "h-full top-0",
        underline: "h-0.5 bottom-0",
      },
    },
    defaultVariants: {
      variant: "rounded",
    },
  }
);

export const SelectTab = ({
  tabs,
  selectedTab,
  onSelect,
  variant = "rounded",
  selectorZIndex = -20,
}: SelectTabProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef(new Array(tabs.length));
  const [xPosition, setXPosition] = useState(0);
  const [tabWidth, setTabWidth] = useState(0);

  const recalculatePositionAndWidth = useCallback(() => {
    const selectedIndex = tabs.indexOf(selectedTab);
    if (containerRef.current && tabRefs.current[selectedIndex]) {
      const containerRect = containerRef.current.getBoundingClientRect();
      const selectedTabRect =
        tabRefs.current[selectedIndex].getBoundingClientRect();
      let newPosition = selectedTabRect.left - containerRect.left;
      let newWidth = selectedTabRect.width;

      if (variant === "underline") {
        newPosition += selectedTabRect.width * 0.15;
        newWidth *= 0.7;
      }
      setXPosition(newPosition);
      setTabWidth(newWidth);
    }
  }, [selectedTab, tabs, variant]);

  useEffect(() => {
    setTimeout(() => {
      recalculatePositionAndWidth();
    }, 100);
  }, [selectedTab, recalculatePositionAndWidth]);

  // useEffect(() => {
  //   const handleResize = () => {
  //     recalculatePositionAndWidth();
  //   };

  //   window.addEventListener("resize", handleResize);
  //   return () => window.removeEventListener("resize", handleResize);
  // }, [recalculatePositionAndWidth]);

  return (
    <div
      ref={containerRef}
      className={classNames(containerVariants({ variant }))}
    >
      {tabs.map((tab, index) => (
        <div
          key={tab}
          ref={(el) => (tabRefs.current[index] = el)}
          className={classNames(
            tabVariants({ variant }),
            (() => {
              if (tab === selectedTab) {
                if (variant === "rounded") {
                  return "text-muted";
                }
              } else {
                if (variant === "underline") {
                  return "text-base-content/70 hover:text-base-content/90";
                }
              }
              return "text-base-content";
            })()
          )}
          onClick={() => onSelect(tab)}
        >
          <p className="flex-shrink-0 w-fit">{tab}</p>
        </div>
      ))}
      <motion.div
        className={classNames(selectorVariants({ variant }))}
        style={{ zIndex: selectorZIndex }}
        initial={{ x: 0 }}
        animate={{ x: xPosition, width: tabWidth }}
      />
    </div>
  );
};
