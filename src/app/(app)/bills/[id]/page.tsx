import type { Metadata } from "next";
import DocumentDetail from "@/ui/components/DocumentDetail";

export const metadata: Metadata = { title: "Bill" };
export default function Page() { return <DocumentDetail kind="bills" />; }
