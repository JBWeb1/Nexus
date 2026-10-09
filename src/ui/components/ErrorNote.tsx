import { AlertCircle } from "lucide-react";
export default function ErrorNote({ error }: { error?: string | null }) { return error ? <div role="alert" className="flex items-start gap-2 text-sm text-destructive bg-destructive-soft border border-destructive/20 rounded-md px-3 py-2.5"><AlertCircle className="size-4 mt-0.5 shrink-0" /><span>{error}</span></div> : null; }
