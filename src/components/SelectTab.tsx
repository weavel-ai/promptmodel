import React, { useEffect, useRef, useState } from "react";
import classNames from "classnames";
import { motion } from "framer-motion";

interface SelectTabProps {
  tabs: string[];
  selectedTab: string;
  onSelect: (tab: string) => void;
}

export const SelectTab = ({ tabs, selectedTab, onSelect }: SelectTabProps) => {
  const containerRef = useRef(null);
  const tabRefs = useRef(new Array(tabs.length));
  const [xPosition, setXPosition] = useState(0);
  const [tabWidth, setTabWidth] = useState(0);

  useEffect(() => {
    const selectedIndex = tabs.indexOf(selectedTab);
    if (containerRef.current && tabRefs.current[selectedIndex]) {
      const containerRect = containerRef.current.getBoundingClientRect();
      const selectedTabRect =
        tabRefs.current[selectedIndex].getBoundingClientRect();

      // Calculate the x position and width of the selected tab
      const newPosition = selectedTabRect.left - containerRect.left;
      const newWidth = selectedTabRect.width;
      setXPosition(newPosition);
      setTabWidth(newWidth);
    }
  }, [selectedTab, tabs.length]);

  return (
    <div
      ref={containerRef}
      className="bg-secondary/20 backdrop-blur-sm rounded-full w-fit p-px h-8 flex flex-row items-center relative"
    >
      {tabs.map((tab, index) => (
        <div
          key={tab}
          ref={(el) => (tabRefs.current[index] = el)}
          className={classNames(
            "rounded-full w-full h-full px-3 flex justify-center items-center cursor-pointer transition-colors bg-transparent z-0",
            tab === selectedTab ? "text-neutral" : "text-base-content"
          )}
          onClick={() => onSelect(tab)}
        >
          {tab}
        </div>
      ))}
      <motion.div
        className="absolute top-0 left-0 h-full bg-base-content/90 rounded-full -z-20"
        initial={{ x: 0 }}
        animate={{ x: xPosition, width: tabWidth }}
      />
    </div>
  );
};
