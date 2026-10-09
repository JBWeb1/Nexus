"use client";
import type { ComponentProps } from "react";
import * as M from "@radix-ui/react-dropdown-menu";
import { cn } from "../../lib/utils";
export const DropdownMenu = M.Root; export const DropdownMenuTrigger = M.Trigger;
export const DropdownMenuContent = ({ className, sideOffset = 6, ...p }: ComponentProps<typeof M.Content>) => <M.Portal><M.Content sideOffset={sideOffset} className={cn("z-50 min-w-56 overflow-hidden rounded-lg border bg-card p-1 shadow-pop data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95", className)} {...p} /></M.Portal>;
export const DropdownMenuItem = ({ className, ...p }: ComponentProps<typeof M.Item>) => <M.Item className={cn("relative flex cursor-pointer select-none items-center gap-2 rounded-md px-2.5 py-2 text-sm outline-none transition-colors focus:bg-muted data-[disabled]:opacity-50", className)} {...p} />;
export const DropdownMenuLabel = ({ className, ...p }: ComponentProps<typeof M.Label>) => <M.Label className={cn("px-2.5 py-1.5 text-xs font-semibold text-muted-foreground", className)} {...p} />;
export const DropdownMenuSeparator = () => <M.Separator className="my-1 h-px bg-border" />;
