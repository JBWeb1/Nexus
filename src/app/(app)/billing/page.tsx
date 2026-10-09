import type { Metadata } from "next";
import View from "@/ui/views/Billing";

export const metadata: Metadata = { title: "Billing" };
export default function Page() { return <View />; }
