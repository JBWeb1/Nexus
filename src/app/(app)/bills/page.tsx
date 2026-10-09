import type { Metadata } from "next";
import DocList from "@/ui/components/DocList";

export const metadata: Metadata = { title: "Bills" };
export default function Page() { return <DocList kind="bills" />; }
