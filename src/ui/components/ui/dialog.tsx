"use client";
import type { ComponentProps } from "react";
import * as D from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "../../lib/utils";
export const Dialog = D.Root; export const DialogTrigger = D.Trigger; export const DialogClose = D.Close;
export const DialogContent = ({ className, children, ...p }: ComponentProps<typeof D.Content>) => (
  <D.Portal><D.Overlay className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=open]:fade-in-0" />
    <D.Content className={cn("fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-lg border bg-card p-6 shadow-pop data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95", className)} {...p}>{children}
      <D.Close className="absolute right-4 top-4 rounded-sm p-1 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Close"><X className="size-4" /></D.Close></D.Content></D.Portal>);
export const DialogTitle = ({ className, ...p }: ComponentProps<typeof D.Title>) => <D.Title className={cn("text-lg font-semibold", className)} {...p} />;
export const DialogDescription = ({ className, ...p }: ComponentProps<typeof D.Description>) => <D.Description className={cn("text-sm text-muted-foreground mt-1", className)} {...p} />;
