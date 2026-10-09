import type { Metadata } from "next";
import View from "@/ui/views/RecurringList";

export const metadata: Metadata = { title: "Recurring invoices" };
export default function Page() { return <View />; }
