type Tone = "credit" | "debit" | "neutral";
const tones: Record<Tone, string> = { credit: "text-success", debit: "text-destructive", neutral: "text-foreground" };
export function formatMoney(amount: number | string | null | undefined, currency = "ZAR") { return new Intl.NumberFormat("en-ZA", { style: "currency", currency, minimumFractionDigits: 2 }).format(Number(amount || 0)); }
export default function Money({ amount, currency = "ZAR", tone = "neutral", className = "" }: { amount: number | string | null | undefined; currency?: string; tone?: Tone | string; className?: string }) { return <span className={`figure whitespace-nowrap ${tones[tone as Tone] || tones.neutral} ${className}`}>{formatMoney(amount, currency)}</span>; }
