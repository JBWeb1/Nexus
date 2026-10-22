"use client";
import type { ReactNode } from "react"; import { motion } from "framer-motion"; import type { LucideIcon } from "lucide-react";

/** What an empty list shows: an icon, one line on what goes here, and the button that adds the first one. */
export default function EmptyState({ icon: Icon, title, children, action }: { icon: LucideIcon; title: string; children?: ReactNode; action?: ReactNode }) {
  return (<motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="flex flex-col items-center px-4 py-10 text-center">
    <motion.div initial={{ scale: 0.8, rotate: -6 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 260, damping: 16, delay: 0.05 }} className="grid size-14 place-items-center rounded-2xl bg-primary-soft text-primary"><Icon className="size-6" /></motion.div>
    <h3 className="mt-4 text-base font-semibold">{title}</h3>{children && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{children}</p>}{action && <div className="mt-5">{action}</div>}
  </motion.div>);
}
