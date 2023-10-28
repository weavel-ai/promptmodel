import classNames from "classnames";
import { motion } from "framer-motion";

interface SelectTabProps {
  tabs: string[];
  selectedTab: string;
  onSelect: (tab: string) => void;
}

export const SelectTab = ({ tabs, selectedTab, onSelect }: SelectTabProps) => {
  return (
    <div className="bg-secondary/20 backdrop-blur-sm rounded-full w-fit p-px h-8 flex flex-row items-center relative">
      {tabs.map((tab) => (
        <div
          key={tab}
          className={classNames(
            "rounded-full w-full h-full px-3 flex justify-center items-center cursor-pointer transition-colors",
            tab == selectedTab ? "text-neutral" : "text-base-content"
          )}
          onClick={() => onSelect(tab)}
        >
          {tab}
        </div>
      ))}
      {/* Animated white box to color the selected tab */}
      <motion.div
        className={`absolute top-0 left-0 h-full bg-base-content/90 rounded-full -z-10`}
        style={{
          width: `calc(100% / ${tabs.length})`,
        }}
        initial={{ x: 0 }}
        animate={{
          x: `${tabs.indexOf(selectedTab) * 100}%`,
          scaleX: 1.05,
        }}
      />
    </div>
  );
};
