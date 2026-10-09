"use client";
import { motion } from "framer-motion";
export default function AuthShell({ title, children, footer }) {
  return (<div className="relative grid min-h-screen place-items-center overflow-hidden bg-sidebar p-4">
    <div aria-hidden className="pointer-events-none absolute -top-40 left-1/2 h-[28rem] w-[44rem] -translate-x-1/2 rounded-full bg-primary/25 blur-[120px]" />
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: "easeOut" }} className="relative w-full max-w-md">
      <img src="/nexus-logo.png" alt="Nexus" className="mx-auto w-40" style={{ mixBlendMode: "screen" }} />
      <div className="mt-3 rounded-xl border border-white/10 bg-card p-7 shadow-pop"><h1 className="mb-5 text-2xl font-bold">{title}</h1>{children}</div>
      <div className="mt-5 text-center text-sm text-sidebar-muted [&_a]:font-medium [&_a]:text-white [&_a]:underline">{footer}</div></motion.div></div>);
}
