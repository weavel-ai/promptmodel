"use client";

import React, { forwardRef, ReactElement } from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-content hover:bg-primary/90 active:scale-90",
        destructive:
          "bg-destructive text-destructive-content hover:bg-destructive/90",
        outline:
          "border border-muted-content/50 bg-transparent hover:bg-accent/20",
        secondary: "bg-secondary text-secondary-content hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-content",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant, size, asChild = false, ...props },
    ref
  ): ReactElement => {
    const Comp = asChild ? Slot : "button";
    return (
      // @ts-ignore
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      >
        {props.children as any}
      </Comp>
    ) as ReactElement;
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
