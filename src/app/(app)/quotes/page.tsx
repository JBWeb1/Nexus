import type { Metadata } from "next";
import DocList from "@/ui/components/DocList";

export const metadata: Metadata = { title: "Quotes" };
export default function Page() { return <DocList kind="quotes" />; }
