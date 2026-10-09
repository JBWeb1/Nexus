import { Badge, type BadgeVariant } from "./ui/badge";
const kind: Record<string, BadgeVariant> = { DRAFT: "neutral", SENT: "info", APPROVED: "info", PARTIAL: "warning", PAID: "success", ACCEPTED: "success", CONVERTED: "success", ACTIVE: "success", CREDITED: "success", VOID: "danger", DECLINED: "danger", OVERDUE: "danger", PAUSED: "neutral", ENDED: "neutral", MATCHED: "success", UNMATCHED: "warning", IGNORED: "neutral", REVERSED: "danger", COMPLETED: "success", POSTED: "success" };
const label = (s: string) => s.charAt(0) + s.slice(1).toLowerCase();
export default function StatusPill({ status }: { status: string }) { return <Badge variant={kind[status] || "neutral"}>{label(String(status))}</Badge>; }
