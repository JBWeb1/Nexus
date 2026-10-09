import type { ReactNode } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card";
export default function Panel({ title, action, children, className = "" }: { title?: ReactNode; action?: ReactNode; children?: ReactNode; className?: string }) {
  return (<Card className={className}>{(title || action) && <CardHeader>{title && <CardTitle>{title}</CardTitle>}{action}</CardHeader>}<CardContent>{children}</CardContent></Card>);
}
