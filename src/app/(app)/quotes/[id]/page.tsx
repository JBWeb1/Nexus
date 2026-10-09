import type { Metadata } from "next";
import DocumentDetail from "@/ui/components/DocumentDetail";

export const metadata: Metadata = { title: "Quote" };
export default function Page() { return <DocumentDetail kind="quotes" />; }
