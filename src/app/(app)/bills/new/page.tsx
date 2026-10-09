import type { Metadata } from "next";
import DocumentForm from "@/ui/components/DocumentForm";

export const metadata: Metadata = { title: "New bill" };
export default function Page() { return <DocumentForm kind="bills" />; }
