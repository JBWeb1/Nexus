import type { Metadata } from "next";
import View from "@/ui/views/ChartOfAccounts";

export const metadata: Metadata = { title: "Chart of accounts" };
export default function Page() { return <View />; }
