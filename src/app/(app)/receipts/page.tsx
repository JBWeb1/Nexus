import type { Metadata } from "next";
import View from "@/ui/views/Receipts";

export const metadata: Metadata = { title: "Receipts" };
export default function Page() { return <View />; }
