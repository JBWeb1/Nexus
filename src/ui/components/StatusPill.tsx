import { Badge, type BadgeVariant } from "./ui/badge";
const kind: Record<string, BadgeVariant> = { DRAFT: "neutral", SENT: "info", APPROVED: "info", PARTIAL: "warning", PAID: "success", ACCEPTED: "success", CONVERTED: "success", ACTIVE: "success", CREDITED: "success", VOID: "danger", DECLINED: "danger", OVERDUE: "danger", PAUSED: "neutral", ENDED: "neutral", MATCHED: "success", UNMATCHED: "warning", IGNORED: "neutral", REVERSED: "danger", COMPLETED: "success", POSTED: "success", BILLED: "success", CANCELLED: "neutral", ARCHIVED: "neutral" };
const label = (s: string) => s.charAt(0) + s.slice(1).toLowerCase();
// A coloured dot before the word, so the status reads at a glance; open items pulse gently.
const LIVE = new Set(["OVERDUE", "PARTIAL"]);
export default function StatusPill({ status }: { status: string }) {
  return <Badge variant={kind[status] || "neutral"} className="whitespace-nowrap"><span className={`size-1.5 rounded-full bg-current ${LIVE.has(status) ? "animate-pulse" : "opacity-70"}`} aria-hidden />{label(String(status))}</Badge>;
}
