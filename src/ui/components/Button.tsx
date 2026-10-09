"use client";
import type { ButtonHTMLAttributes } from "react";
import { UIButton } from "./ui/button";
type Variant = "primary" | "gold" | "secondary" | "danger" | "ghost";
const map = { primary: "default", gold: "success", secondary: "outline", danger: "destructive", ghost: "ghost" } as const;
export default function Button({ variant = "primary", className = "", children, type = "button", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant | string }) {
  return <UIButton type={type} variant={map[variant as Variant] || "default"} className={className} {...props}>{children}</UIButton>;
}
