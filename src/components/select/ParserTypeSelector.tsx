import { ReactElement } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import classNames from "classnames";
import { ParsingType } from "@/types/ParsingType";
import { CaretDown } from "@phosphor-icons/react";

interface ParserTypeSelectorProps {
  parser: ParsingType;
  selectParser?: (parser: ParsingType) => void;
}

export const ParserTypeSelector = ({
  parser,
  selectParser,
}: ParserTypeSelectorProps) => {
  return (
    <div className="grid gap-2">
      <Popover>
        {
          (
            <PopoverTrigger
              aria-label="Output parser type"
              asChild
              disabled={selectParser == undefined}
              className={classNames(!selectParser && "cursor-default")}
            >
              <div
                className={classNames(
                  "flex flex-row justify-between items-center p-2 rounded-md bg-base-content/10 text-base-content",
                  "transition-all min-w-fit w-min",
                  selectParser ? "cursor-pointer" : "hover:bg-base-content/10"
                )}
              >
                <p className="truncate text-sm flex-grow mx-2">
                  {parser ?? "None"}
                </p>
                {selectParser != undefined && (
                  <CaretDown size={20} className="flex-none" />
                )}
              </div>
            </PopoverTrigger>
          ) as ReactElement
        }
        {
          (selectParser && (
            <PopoverContent
              className="w-auto p-0 bg-base-100/30 backdrop-blur-md z-[9999]"
              align="start"
            >
              <div className="flex flex-col">
                <button
                  key="None"
                  className={classNames(
                    "w-full px-4 py-2 text-left text-sm",
                    "transition-all hover:bg-base-content/20"
                  )}
                  onClick={() => selectParser(null)}
                >
                  None
                </button>
                {Object.values(ParsingType).map((parserType) => (
                  <button
                    key={parserType}
                    className={classNames(
                      "w-full px-4 py-2 text-left text-sm",
                      "transition-all hover:bg-base-content/20",
                      parserType === parser && "bg-base-content/20"
                    )}
                    onClick={() => selectParser(parserType)}
                  >
                    {parserType}
                  </button>
                ))}
              </div>
            </PopoverContent>
          )) as ReactElement
        }
      </Popover>
    </div>
  );
};
