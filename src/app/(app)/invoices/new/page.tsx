import type { Metadata } from "next";
import DocumentForm from "@/ui/components/DocumentForm";

export const metadata: Metadata = { title: "New invoice" };
export default function Page() { return <DocumentForm kind="invoices" />; }
