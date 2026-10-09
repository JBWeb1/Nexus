"use client";
import { forwardRef, type ButtonHTMLAttributes } from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils";

export const buttonVariants = cva("inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-semibold transition-all active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0", {
  variants: {
    variant: {
      default: "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90", success: "bg-success text-primary-foreground shadow-sm hover:bg-success/90",
      outline: "border border-input bg-card text-foreground shadow-sm hover:bg-muted", secondary: "bg-muted text-foreground hover:bg-muted/70",
      destructive: "border border-destructive/40 bg-card text-destructive hover:bg-destructive hover:text-primary-foreground", ghost: "text-muted-foreground hover:bg-muted hover:text-foreground", link: "text-primary underline-offset-4 hover:underline",
    },
    size: { default: "h-10 px-4", sm: "h-8 px-3 text-xs", icon: "size-9" },
  },
  defaultVariants: { variant: "default", size: "default" },
});
export interface UIButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> { asChild?: boolean }
export const UIButton = forwardRef<HTMLButtonElement, UIButtonProps>(({ className, variant, size, asChild, ...props }, ref) => {
  const C: any = asChild ? Slot : "button";
  return <C ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />;
});
UIButton.displayName = "UIButton";
