import { cn } from "../../lib/utils";
export const Skeleton = ({ className }: { className?: string }) => <div className={cn("skeleton-shine rounded-md", className)} />;
/** Placeholder rows while a list loads, shaped like the table that will replace them. */
export const SkeletonRows = ({ rows = 6, className }: { rows?: number; className?: string }) => (
  <div className={cn("space-y-3", className)} aria-busy="true" aria-label="Loading">{Array.from({ length: rows }, (_, i) => (
    <div key={i} className="flex items-center gap-4"><Skeleton className="h-4 w-24" /><Skeleton className="h-4 flex-1" /><Skeleton className="h-4 w-20" /><Skeleton className="h-5 w-14 rounded-full" /></div>))}</div>);
/** A whole page loading: title, a row of cards and a panel. */
export const PageSkeleton = () => (<div className="space-y-6" aria-busy="true" aria-label="Loading"><Skeleton className="h-9 w-56" /><div className="grid grid-cols-2 gap-4 md:grid-cols-4">{[0, 1, 2, 3].map((n) => <Skeleton key={n} className="h-24" />)}</div>
  <div className="rounded-lg border bg-card p-5"><SkeletonRows /></div></div>);
