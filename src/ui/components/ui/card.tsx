import type { HTMLAttributes } from "react";
import { cn } from "../../lib/utils";
type Div = HTMLAttributes<HTMLDivElement>;
export const Card = ({ className, ...p }: Div) => <div className={cn("rounded-lg border bg-card shadow-card", className)} {...p} />;
export const CardHeader = ({ className, ...p }: Div) => <div className={cn("flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b", className)} {...p} />;
export const CardTitle = ({ className, ...p }: HTMLAttributes<HTMLHeadingElement>) => <h2 className={cn("text-base font-semibold leading-none", className)} {...p} />;
export const CardContent = ({ className, ...p }: Div) => <div className={cn("p-5", className)} {...p} />;
