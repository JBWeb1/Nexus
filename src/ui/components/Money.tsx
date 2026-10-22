"use client";
import { useEffect, useRef, useState } from "react";
type Tone = "credit" | "debit" | "neutral";
const tones: Record<Tone, string> = { credit: "text-success", debit: "text-destructive", neutral: "text-foreground" };
export function formatMoney(amount: number | string | null | undefined, currency = "ZAR") { return new Intl.NumberFormat("en-ZA", { style: "currency", currency, minimumFractionDigits: 2 }).format(Number(amount || 0)); }

/** Counts a figure up from where it was to its new value (headline totals only). Skipped when the device asks for less motion. */
function useCountUp(target: number, on: boolean) {
  const [v, setV] = useState(on ? 0 : target); const from = useRef(on ? 0 : target);
  useEffect(() => {
    if (!on || (typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches)) { setV(target); from.current = target; return; }
    const start = performance.now(), a = from.current, ms = 750; let raf = 0;
    const step = (t: number) => { const k = Math.min(1, (t - start) / ms), e = 1 - Math.pow(1 - k, 3); setV(a + (target - a) * e); if (k < 1) raf = requestAnimationFrame(step); else from.current = target; };
    raf = requestAnimationFrame(step); return () => cancelAnimationFrame(raf);
  }, [target, on]);
  return v;
}
export default function Money({ amount, currency = "ZAR", tone = "neutral", className = "", animate = false }: { amount: number | string | null | undefined; currency?: string; tone?: Tone | string; className?: string; animate?: boolean }) {
  const shown = useCountUp(Number(amount || 0), animate);
  return <span className={`figure whitespace-nowrap ${tones[tone as Tone] || tones.neutral} ${className}`} aria-label={animate ? formatMoney(amount, currency) : undefined}>{formatMoney(animate ? shown : amount, currency)}</span>;
}
