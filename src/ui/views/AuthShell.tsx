"use client";
import { motion } from "framer-motion"; import { ShieldCheck } from "lucide-react";
export default function AuthShell({ title, children, footer }) {
  return (<div className="relative grid min-h-screen place-items-center overflow-hidden bg-sidebar p-4">
    <div aria-hidden className="pointer-events-none absolute -top-40 left-1/2 h-[28rem] w-[44rem] -translate-x-1/2 rounded-full bg-primary/25 blur-[120px]" />
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: "easeOut" }} className="relative w-full max-w-md">
      <motion.img src="/nexus-logo-clear.png" alt="Nexus" className="mx-auto w-36" initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 220, damping: 18, delay: 0.05 }} />
      <div className="mt-3 rounded-xl border border-white/10 bg-card p-7 shadow-pop"><h1 className="mb-5 text-2xl font-bold">{title}</h1>{children}</div>
      <div className="mt-5 text-center text-sm text-sidebar-muted [&_a]:font-medium [&_a]:text-white [&_a]:underline">{footer}</div>
      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="mt-6 flex items-center justify-center gap-2 text-xs text-sidebar-muted"><ShieldCheck className="size-4 text-success" />Passwords stored only as secure hashes · optional two-step sign-in · each company's data kept apart</motion.p></motion.div></div>);
}
