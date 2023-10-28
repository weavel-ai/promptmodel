"use client";

import { ReactElement, forwardRef } from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";

import classNames from "classnames";

const Popover = PopoverPrimitive.Root;

const PopoverTrigger = PopoverPrimitive.Trigger;

const PopoverContent = forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>
>(
  ({ className, align = "center", sideOffset = 4, ...props }, ref) =>
    (
      <PopoverPrimitive.Portal>
        {
          (
            <PopoverPrimitive.Content
              ref={ref}
              align={align}
              sideOffset={sideOffset}
              className={classNames(
                "z-50 w-72 rounded-md border bg-popover/70 backdrop-blur-md p-4 text-popover-content shadow-md outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
                className
              )}
              {...props}
            />
          ) as ReactElement
        }
      </PopoverPrimitive.Portal>
    ) as ReactElement
);
PopoverContent.displayName = PopoverPrimitive.Content.displayName;

export { Popover, PopoverTrigger, PopoverContent };
